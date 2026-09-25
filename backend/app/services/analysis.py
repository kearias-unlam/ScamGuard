"""Business logic for message analysis. The AI analyzer is injected so the endpoint and tests can swap it."""

from collections.abc import Callable

from app.ai.errors import AIServiceError
from app.models import AnalysisResult

# Takes the user message and returns a validated result; raises AIServiceError on any failure.
Analyzer = Callable[[str], AnalysisResult]


def unavailable_analyzer(message: str) -> AnalysisResult:
    """Placeholder until task #18 wires the validated AI analyzer: always fails, so the endpoint returns 503."""
    raise AIServiceError("AI analyzer is not wired yet (task #18)")


def get_analyzer() -> Analyzer:
    """FastAPI dependency provider. Task #18 changes this to return the validated analyzer."""
    return unavailable_analyzer


def analyze_message(message: str, analyzer: Analyzer) -> AnalysisResult:
    return analyzer(message)
