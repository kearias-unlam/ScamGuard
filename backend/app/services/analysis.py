"""Business logic for message analysis: run the injected AI analyzer, then apply the evidence check and the undetermined rule."""

from collections.abc import Callable

from app.ai.analyzer import analyze_with_model
from app.models import AnalysisResult

# Takes the user message and returns a schema-validated result; raises AIServiceError on any failure.
Analyzer = Callable[[str], AnalysisResult]

# User-visible text (docs/requirements.md, UI texts). Defined once in the backend.
UNDETERMINED_EXPLANATION = "No se encontraron citas del mensaje que respalden los indicadores."


def get_analyzer() -> Analyzer:
    """FastAPI dependency provider; tests override it with a stub."""
    return analyze_with_model


def _normalize(text: str) -> str:
    """Case-insensitive form with runs of whitespace collapsed to one space and edges trimmed."""
    return " ".join(text.split()).casefold()


def apply_evidence_check(message: str, result: AnalysisResult) -> AnalysisResult:
    """Drop indicators whose evidence is empty or not quoted from the message.
    If the model returned indicators and all are dropped, the risk becomes UNDETERMINED."""
    normalized_message = _normalize(message)
    kept = [
        indicator for indicator in result.indicators
        if (evidence := _normalize(indicator.evidence)) and evidence in normalized_message
    ]
    if result.indicators and not kept:
        return result.model_copy(update={
            "risk_level": "UNDETERMINED", "explanation": UNDETERMINED_EXPLANATION, "indicators": [],
        })
    return result.model_copy(update={"indicators": kept})


def analyze_message(message: str, analyzer: Analyzer) -> AnalysisResult:
    return apply_evidence_check(message, analyzer(message))
