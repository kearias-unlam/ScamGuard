# US-6.2: POST /analysis/url analyzes the URL digest with the same rules as a message and never saves it.
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient

from app.ai.analyzer import AnalyzedMessage
from app.ai.errors import AIServiceError
from app.main import app
from app.models import AnalysisResult, Indicator
from app.services.analysis import get_analyzer, get_message_saver
from app.services.recommendations import RECOMMENDATION_TEXTS
from app.services.url_digest import build_url_digest
from app.storage.critical_messages import list_critical_topics

BUSY_DETAIL = "Los servidores están ocupados. Intentá de nuevo más tarde."
# US-7.1: every stubbed result is HIGH, so these are the recommendations it gets.
HIGH_RECOMMENDATIONS = [
    {"type": type_, "text": RECOMMENDATION_TEXTS[type_]} for type_ in ("do_not_follow", "if_already_acted")
]
UNREADABLE_DETAIL = "No se pudo leer el link. Verificá que sea una dirección completa, por ejemplo https://ejemplo.com."
URL = "https://mercadopago-seguridad.com/login?cuenta=suspendida"
DOMAIN_LINE = "Dominio: mercadopago-seguridad.com"


def _indicator(type_: str, evidence: str) -> Indicator:
    return Indicator(type=type_, title="Señal", description="Podría ser un engaño.", evidence=evidence)


def _stub(indicators: list[Indicator], received: list[str] | None = None) -> Callable[[str], AnalyzedMessage]:
    def stub(message: str) -> AnalyzedMessage:
        if received is not None:
            received.append(message)
        result = AnalysisResult(
            risk_level="HIGH", summary="Imita a una billetera.", explanation="Podría ser un engaño.",
            indicators=indicators,
        )
        # A non-blank masked message: it must still never be saved for a link.
        return AnalyzedMessage(result=result, topic="bank_impersonation", masked_message="Link de pago")

    return stub


def _must_not_run(_: str) -> AnalyzedMessage:
    raise AssertionError("analyzer must not be called")


@pytest.fixture(autouse=True)
def reset_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


def test_happy_path_analyzer_receives_the_digest(client: TestClient) -> None:
    received: list[str] = []
    app.dependency_overrides[get_analyzer] = lambda: _stub([], received)

    response = client.post("/analysis/url", json={"url": URL})

    assert response.status_code == 200
    assert received == [build_url_digest(URL)]
    assert received[0].startswith(f"Enlace: {URL}")
    assert response.json() == {"result": {
        "riskLevel": "HIGH", "summary": "Imita a una billetera.", "explanation": "Podría ser un engaño.",
        "indicators": [],
    }, "recommendations": HIGH_RECOMMENDATIONS}


def test_indicator_quoting_a_digest_line_is_kept(client: TestClient) -> None:
    app.dependency_overrides[get_analyzer] = lambda: _stub([_indicator("lookalike_domain", DOMAIN_LINE)])

    response = client.post("/analysis/url", json={"url": URL})

    indicators = response.json()["result"]["indicators"]
    assert [indicator["evidence"] for indicator in indicators] == [DOMAIN_LINE]


def test_quote_not_in_the_digest_is_dropped(client: TestClient) -> None:
    app.dependency_overrides[get_analyzer] = lambda: _stub([
        _indicator("lookalike_domain", DOMAIN_LINE),
        _indicator("obfuscated_link", "Dirección IP: sí"),  # No such line in the digest.
    ])

    response = client.post("/analysis/url", json={"url": URL})

    result = response.json()["result"]
    assert [indicator["evidence"] for indicator in result["indicators"]] == [DOMAIN_LINE]
    assert result["riskLevel"] == "HIGH"


@pytest.mark.parametrize("url", ["", " \t "])
def test_blank_link_returns_422(client: TestClient, url: str) -> None:
    app.dependency_overrides[get_analyzer] = lambda: _must_not_run

    response = client.post("/analysis/url", json={"url": url})

    assert response.status_code == 422


def test_too_long_link_returns_422(client: TestClient) -> None:
    app.dependency_overrides[get_analyzer] = lambda: _must_not_run

    response = client.post("/analysis/url", json={"url": "https://ejemplo.com/" + "a" * 2_000})

    assert response.status_code == 422


@pytest.mark.parametrize("url", ["https://ejemplo", "ftp://ejemplo.com", "javascript:alert(1)"])
def test_invalid_link_returns_422_with_unreadable_detail(client: TestClient, url: str) -> None:
    app.dependency_overrides[get_analyzer] = lambda: _must_not_run

    response = client.post("/analysis/url", json={"url": url})

    assert response.status_code == 422
    assert response.json() == {"detail": UNREADABLE_DETAIL}


def test_ai_error_returns_503(client: TestClient) -> None:
    def failing(_: str) -> AnalyzedMessage:
        raise AIServiceError("boom")

    app.dependency_overrides[get_analyzer] = lambda: failing

    response = client.post("/analysis/url", json={"url": URL})

    assert response.status_code == 503
    assert response.json() == {"detail": BUSY_DETAIL}


def test_response_has_neither_topic_nor_masked_message(client: TestClient) -> None:
    app.dependency_overrides[get_analyzer] = lambda: _stub([])

    body = client.post("/analysis/url", json={"url": URL}).json()

    assert set(body) == {"result", "recommendations"}
    assert set(body["result"]) == {"riskLevel", "summary", "explanation", "indicators"}


def test_nothing_is_saved(client: TestClient) -> None:
    saved: list[tuple[str, str]] = []
    app.dependency_overrides[get_analyzer] = lambda: _stub([_indicator("lookalike_domain", DOMAIN_LINE)])
    app.dependency_overrides[get_message_saver] = lambda: lambda topic, text: saved.append((topic, text))

    response = client.post("/analysis/url", json={"url": URL})

    assert response.status_code == 200
    assert saved == []
    assert list_critical_topics() == []
