"""Business logic for message analysis: run the injected AI analyzer, apply the evidence check and the undetermined
rule, and save the message to the critical messages panel when the user shared it (US-3.3). Emails (US-4.2) and links
(US-6.2) are analyzed through their digest with the same rules and are never saved. Every response carries the
recommendations for its checked result (US-7.1)."""

import logging
from collections.abc import Callable

from app.ai.analyzer import AnalyzedMessage, analyze_with_model
from app.models import AnalysisResult, MessageAnalysisResponse, Topic
from app.normalization import normalize_text
from app.services.email_digest import build_email_digest
from app.services.masking import mask_personal_data
from app.services.recommendations import build_recommendations
from app.services.url_digest import build_url_digest
from app.storage.critical_messages import StorageError, save_critical_message

logger = logging.getLogger(__name__)

# Takes the user message and returns a schema-validated result with its topic and masked message;
# raises AIServiceError on any failure.
Analyzer = Callable[[str], AnalyzedMessage]

# Stores an already masked message with its topic; raises StorageError on any failure.
MessageSaver = Callable[[Topic, str], None]

# User-visible text (docs/requirements.md, UI texts). Defined once in the backend.
UNDETERMINED_EXPLANATION = "No se encontraron citas del mensaje que respalden los indicadores."


def get_analyzer() -> Analyzer:
    """FastAPI dependency provider; tests override it with a stub."""
    return analyze_with_model


def get_message_saver() -> MessageSaver:
    """FastAPI dependency provider; tests override it with a recorder."""
    return save_critical_message


def apply_evidence_check(message: str, result: AnalysisResult) -> AnalysisResult:
    """Drop indicators whose evidence is empty or not quoted from the message.
    If the model returned indicators and all are dropped, the risk becomes UNDETERMINED."""
    normalized_message = normalize_text(message)
    kept = [
        indicator for indicator in result.indicators
        if (evidence := normalize_text(indicator.evidence)) and evidence in normalized_message
    ]
    if result.indicators and not kept:
        return result.model_copy(update={
            "risk_level": "UNDETERMINED", "explanation": UNDETERMINED_EXPLANATION, "indicators": [],
        })
    return result.model_copy(update={"indicators": kept})


def _save_if_shared(analyzed: AnalyzedMessage, result: AnalysisResult, sensitive_data: str, save: MessageSaver) -> None:
    """Save only shared messages whose final risk is HIGH and whose masked text is not blank.
    A storage failure is logged and never changes the analysis response."""
    if result.risk_level != "HIGH" or not analyzed.masked_message.strip():
        return
    try:
        save(analyzed.topic, mask_personal_data(analyzed.masked_message, sensitive_data))
    except StorageError as error:
        logger.warning("Critical message not saved: %s", error)  # Internal cause only; never sent to the client.


def analyze_message(
    message: str,
    analyzer: Analyzer,
    *,
    share_in_panel: bool = False,
    sensitive_data: str = "",
    save: MessageSaver = save_critical_message,
) -> AnalysisResult:
    analyzed = analyzer(message)
    result = apply_evidence_check(message, analyzed.result)
    if share_in_panel:
        _save_if_shared(analyzed, result, sensitive_data, save)
    # topic and masked_message stay internal: only the checked result is returned.
    return result


def analyze_email(email_content: str, analyzer: Analyzer) -> AnalysisResult:
    """US-4.2: analyze the email digest with the same rules as a message. Raises InvalidEmailError (422) when the email
    has no readable text body. Emails are never shared, so nothing is ever saved."""
    digest = build_email_digest(email_content)
    return analyze_message(digest, analyzer, share_in_panel=False)


def analyze_url(url: str, analyzer: Analyzer) -> AnalysisResult:
    """US-6.2: analyze the URL digest with the same rules as a message. Raises InvalidUrlError (422) when the text is
    not a valid http or https link. Links are never opened or shared, so nothing is ever saved."""
    digest = build_url_digest(url)
    return analyze_message(digest, analyzer, share_in_panel=False)


def build_analysis_response(result: AnalysisResult) -> MessageAnalysisResponse:
    """US-7.1: the response of the three analysis endpoints, with the recommendations for the checked result."""
    return MessageAnalysisResponse(result=result, recommendations=build_recommendations(result))
