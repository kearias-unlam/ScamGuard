import json
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.ai import analyzer as ai_analyzer
from app.ai.analyzer import analyze_with_model
from app.ai.errors import AIServiceError
from app.main import app
from app.models import AnalysisResult, Indicator
from app.services.analysis import get_analyzer

BUSY_DETAIL = "Los servidores están ocupados. Intentá de nuevo más tarde."


@pytest.fixture(autouse=True)
def reset_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


def test_returns_camel_case_result_from_analyzer(client: TestClient) -> None:
    received: list[str] = []

    def stub(message: str) -> AnalysisResult:
        received.append(message)
        return AnalysisResult(
            risk_level="HIGH",
            summary="Pide transferir dinero.",
            explanation="Urgencia y pedido de pago.",
            indicators=[Indicator(type="urgency", title="Urgencia", description="Presiona al usuario.", evidence="hoy mismo")],
        )

    app.dependency_overrides[get_analyzer] = lambda: stub
    response = client.post("/analysis", json={"message": "Transferí hoy mismo"})

    assert response.status_code == 200
    assert response.json() == {"result": {
        "riskLevel": "HIGH",
        "summary": "Pide transferir dinero.",
        "explanation": "Urgencia y pedido de pago.",
        "indicators": [{"type": "urgency", "title": "Urgencia", "description": "Presiona al usuario.", "evidence": "hoy mismo"}],
    }}
    assert received == ["Transferí hoy mismo"]


def test_ai_error_returns_503_with_spanish_detail(client: TestClient) -> None:
    def failing(message: str) -> AnalysisResult:
        raise AIServiceError("boom")

    app.dependency_overrides[get_analyzer] = lambda: failing
    response = client.post("/analysis", json={"message": "hola"})

    assert response.status_code == 503
    assert response.json() == {"detail": BUSY_DETAIL}


@pytest.mark.parametrize("message", ["", "   \n\t "])
def test_blank_message_returns_422(client: TestClient, message: str) -> None:
    def must_not_run(_: str) -> AnalysisResult:
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
    })
    monkeypatch.setattr(ai_analyzer, "generate_text", lambda instructions, user_input, **_: model_json)

    response = client.post("/analysis", json={"message": "Hola, pasame el código que te llegó"})

    assert response.status_code == 200
    assert response.json() == {"result": {
        "riskLevel": "HIGH",
        "summary": "Pide un código de verificación.",
        "explanation": "Podría ser un intento de robo de cuenta.",
        "indicators": [{"type": "personal_data_request", "title": "Pedido de código",
                        "description": "Solicita un código de verificación.", "evidence": "Pasame el CÓDIGO"}],
    }}


def test_default_dependency_invalid_model_output_returns_503(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ai_analyzer, "generate_text", lambda instructions, user_input, **_: "no es JSON")
    response = client.post("/analysis", json={"message": "hola"})
    assert response.status_code == 503
    assert response.json() == {"detail": BUSY_DETAIL}
