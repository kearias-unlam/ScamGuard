# US-3.1: contract models for the critical messages panel and the optional share fields.
import pytest
from pydantic import ValidationError

from app.models import (
    MAX_EMAIL_CONTENT_CHARS,
    MAX_URL_CHARS,
    CriticalMessagesResponse,
    EmailAnalysisRequest,
    MessageAnalysisRequest,
    MessageAnalysisResponse,
    UrlAnalysisRequest,
)


def test_request_without_share_fields_uses_defaults() -> None:
    request = MessageAnalysisRequest.model_validate({"message": "hola"})

    assert request.share_in_panel is False
    assert request.sensitive_data == ""


def test_request_accepts_camel_case_share_fields() -> None:
    request = MessageAnalysisRequest.model_validate(
        {"message": "hola", "shareInPanel": True, "sensitiveData": "Juan, Calle Falsa 123"}
    )

    assert request.share_in_panel is True
    assert request.sensitive_data == "Juan, Calle Falsa 123"


def test_critical_messages_response_serializes_camel_case() -> None:
    response = CriticalMessagesResponse.model_validate({"topics": [{
        "topic": "family_money_request",
        "title": "Pedido de dinero de un familiar o conocido",
        "timesShared": 3,
        "messages": [{"id": 1, "text": "Hola, soy [nombre], necesito plata urgente.", "timesShared": 3}],
    }]})

    assert response.model_dump(by_alias=True) == {"topics": [{
        "topic": "family_money_request",
        "title": "Pedido de dinero de un familiar o conocido",
        "timesShared": 3,
        "messages": [{"id": 1, "text": "Hola, soy [nombre], necesito plata urgente.", "timesShared": 3}],
    }]}


def test_critical_topic_rejects_unknown_topic() -> None:
    with pytest.raises(ValidationError):
        CriticalMessagesResponse.model_validate({"topics": [{"topic": "unknown", "title": "x", "timesShared": 0, "messages": []}]})


# US-3.4: the share counts are required, never defaulted.
def test_critical_message_requires_times_shared() -> None:
    with pytest.raises(ValidationError):
        CriticalMessagesResponse.model_validate({"topics": [{
            "topic": "other", "title": "Otros engaños", "timesShared": 1,
            "messages": [{"id": 1, "text": "Hola"}],
        }]})


# US-4.2: emailContent is required, non-blank, and at most 1,000,000 characters.
def test_email_request_accepts_content_at_the_size_limit() -> None:
    request = EmailAnalysisRequest.model_validate({"emailContent": "a" * MAX_EMAIL_CONTENT_CHARS})

    assert len(request.email_content) == MAX_EMAIL_CONTENT_CHARS


@pytest.mark.parametrize("content", ["a" * (MAX_EMAIL_CONTENT_CHARS + 1), "", "  \n "])
def test_email_request_rejects_too_large_or_blank_content(content: str) -> None:
    with pytest.raises(ValidationError):
        EmailAnalysisRequest.model_validate({"emailContent": content})


# US-6.2: url is required, non-blank, and at most 2,000 characters.
def test_url_request_accepts_a_link_at_the_size_limit() -> None:
    request = UrlAnalysisRequest.model_validate({"url": "a" * MAX_URL_CHARS})

    assert len(request.url) == MAX_URL_CHARS


@pytest.mark.parametrize("url", ["a" * (MAX_URL_CHARS + 1), "", "  	 "])
def test_url_request_rejects_too_long_or_blank_links(url: str) -> None:
    with pytest.raises(ValidationError):
        UrlAnalysisRequest.model_validate({"url": url})


# US-7.1: recommendations sit next to result, in camelCase, with a type from the fixed catalog.
def test_analysis_response_serializes_recommendations_next_to_result() -> None:
    result = {"riskLevel": "LOW", "summary": "Saludo.", "explanation": "Sin señales.", "indicators": []}
    recommendation = {"type": "stay_alert", "text": "Desconfiá si te piden datos."}

    response = MessageAnalysisResponse.model_validate({"result": result, "recommendations": [recommendation]})

    assert response.model_dump(by_alias=True) == {"result": result, "recommendations": [recommendation]}


def test_analysis_response_rejects_unknown_recommendation_type() -> None:
    with pytest.raises(ValidationError):
        MessageAnalysisResponse.model_validate({
            "result": {"riskLevel": "LOW", "summary": "", "explanation": "", "indicators": []},
            "recommendations": [{"type": "unknown", "text": "x"}],
        })
