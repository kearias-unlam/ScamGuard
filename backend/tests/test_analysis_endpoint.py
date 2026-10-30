import json
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.ai import analyzer as ai_analyzer
from app.ai.analyzer import AnalyzedMessage, analyze_with_model
from app.ai.errors import AIServiceError
from app.main import app
from app.models import AnalysisResult, Indicator
from app.services.analysis import get_analyzer, get_message_saver
from app.services.recommendations import RECOMMENDATION_TEXTS

BUSY_DETAIL = "Los servidores están ocupados. Intentá de nuevo más tarde."
# US-7.1: every stubbed result is HIGH, so these are the recommendations it gets.
HIGH_RECOMMENDATIONS = [
    {"type": type_, "text": RECOMMENDATION_TEXTS[type_]} for type_ in ("do_not_follow", "if_already_acted")
]


@pytest.fixture(autouse=True)
def reset_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


def test_returns_camel_case_result_from_analyzer(client: TestClient) -> None:
    received: list[str] = []

    def stub(message: str) -> AnalyzedMessage:
        received.append(message)
        result = AnalysisResult(
            risk_level="HIGH",
            summary="Pide transferir dinero.",
            explanation="Urgencia y pedido de pago.",
            indicators=[Indicator(type="urgency", title="Urgencia", description="Presiona al usuario.", evidence="hoy mismo")],
        )
        return AnalyzedMessage(result=result, topic="other", masked_message="Transferí hoy mismo")

    app.dependency_overrides[get_analyzer] = lambda: stub
    response = client.post("/analysis", json={"message": "Transferí hoy mismo"})

    assert response.status_code == 200
    assert response.json() == {"result": {
        "riskLevel": "HIGH",
        "summary": "Pide transferir dinero.",
        "explanation": "Urgencia y pedido de pago.",
        "indicators": [{"type": "urgency", "title": "Urgencia", "description": "Presiona al usuario.", "evidence": "hoy mismo"}],
    }, "recommendations": HIGH_RECOMMENDATIONS}
    assert received == ["Transferí hoy mismo"]


def test_ai_error_returns_503_with_spanish_detail(client: TestClient) -> None:
    def failing(message: str) -> AnalyzedMessage:
        raise AIServiceError("boom")

    app.dependency_overrides[get_analyzer] = lambda: failing
    response = client.post("/analysis", json={"message": "hola"})

    assert response.status_code == 503
    assert response.json() == {"detail": BUSY_DETAIL}


@pytest.mark.parametrize("message", ["", "   \n\t "])
def test_blank_message_returns_422(client: TestClient, message: str) -> None:
    def must_not_run(_: str) -> AnalyzedMessage:
        raise AssertionError("analyzer must not be called")

    app.dependency_overrides[get_analyzer] = lambda: must_not_run
    response = client.post("/analysis", json={"message": message})

    assert response.status_code == 422


def test_default_analyzer_is_the_validated_model_analyzer() -> None:
    assert get_analyzer() is analyze_with_model


def test_default_dependency_returns_checked_camel_case_result(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    model_json = json.dumps({
        "summary": "Pide un código de verificación.",
        "indicators": [{"type": "personal_data_request", "title": "Pedido de código",
                        "description": "Solicita un código de verificación.", "evidence": "Pasame el CÓDIGO"}],
        "riskLevel": "HIGH",
        "explanation": "Podría ser un intento de robo de cuenta.",
        "topic": "credentials_request",
        "maskedMessage": "Hola, pasame el código que te llegó",
    })
    monkeypatch.setattr(ai_analyzer, "generate_text", lambda instructions, user_input, **_: model_json)

    response = client.post("/analysis", json={"message": "Hola, pasame el código que te llegó"})

    assert response.status_code == 200
    # US-3.3: topic and maskedMessage are internal and never reach the response.
    assert response.json() == {"result": {
        "riskLevel": "HIGH",
        "summary": "Pide un código de verificación.",
        "explanation": "Podría ser un intento de robo de cuenta.",
        "indicators": [{"type": "personal_data_request", "title": "Pedido de código",
                        "description": "Solicita un código de verificación.", "evidence": "Pasame el CÓDIGO"}],
    }, "recommendations": HIGH_RECOMMENDATIONS}


def test_default_dependency_invalid_model_output_returns_503(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ai_analyzer, "generate_text", lambda instructions, user_input, **_: "no es JSON")
    response = client.post("/analysis", json={"message": "hola"})
    assert response.status_code == 503
    assert response.json() == {"detail": BUSY_DETAIL}


# US-3.3: the router passes the share fields and the injected saver to the service.
def test_shared_high_message_is_saved_through_the_injected_saver(client: TestClient) -> None:
    saved: list[tuple[str, str]] = []
    result = AnalysisResult(
        risk_level="HIGH",
        summary="Pide plata urgente.",
        explanation="Urgencia y pedido de dinero.",
        indicators=[Indicator(type="urgency", title="Urgencia", description="Presiona al usuario.", evidence="urgente")],
    )

    def stub(message: str) -> AnalyzedMessage:
        return AnalyzedMessage(result=result, topic="family_money_request", masked_message="Soy [nombre], Juan te pide plata urgente")

    app.dependency_overrides[get_analyzer] = lambda: stub
    app.dependency_overrides[get_message_saver] = lambda: lambda topic, text: saved.append((topic, text))
    response = client.post("/analysis", json={
        "message": "Soy Ana, Juan te pide plata urgente", "shareInPanel": True, "sensitiveData": "Juan",
    })

    assert response.status_code == 200
    assert saved == [("family_money_request", "Soy [nombre], [dato oculto] te pide plata urgente")]


def test_request_without_share_fields_saves_nothing(client: TestClient) -> None:
    saved: list[tuple[str, str]] = []
    result = AnalysisResult(
        risk_level="HIGH",
        summary="Pide plata urgente.",
        explanation="Urgencia.",
        indicators=[Indicator(type="urgency", title="Urgencia", description="Presiona al usuario.", evidence="urgente")],
    )
    app.dependency_overrides[get_analyzer] = lambda: lambda _: AnalyzedMessage(result=result, topic="other", masked_message="urgente")
    app.dependency_overrides[get_message_saver] = lambda: lambda topic, text: saved.append((topic, text))

    response = client.post("/analysis", json={"message": "Es urgente"})

    assert response.status_code == 200
    assert saved == []
