"""Validated AI analyzer: calls the model with the prompt and output schema, and validates its JSON (see docs/requirements.md, AI contract)."""

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.ai.client import generate_text
from app.ai.errors import AIServiceError
from app.ai.prompt import INSTRUCTIONS, OUTPUT_FORMAT, IndicatorType, ModelRiskLevel
from app.models import AnalysisResult, Indicator


class _ModelIndicator(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    type: IndicatorType
    title: str
    description: str
    evidence: str


class _ModelOutput(BaseModel):
    """Mirror of OUTPUT_SCHEMA: camelCase keys only, no extra keys, riskLevel without UNDETERMINED."""

    model_config = ConfigDict(extra="forbid", strict=True)

    summary: str
    indicators: list[_ModelIndicator]
    risk_level: ModelRiskLevel = Field(alias="riskLevel")
    explanation: str


def parse_model_output(text: str) -> AnalysisResult:
    """Validate the model JSON; raise AIServiceError if it is not JSON or does not match the schema."""
    try:
        output = _ModelOutput.model_validate_json(text)
    except ValidationError as error:
        raise AIServiceError("Model returned invalid output") from error
    return AnalysisResult(
        risk_level=output.risk_level,
        summary=output.summary,
        explanation=output.explanation,
        indicators=[
            Indicator(type=item.type, title=item.title, description=item.description, evidence=item.evidence)
            for item in output.indicators
        ],
    )


def analyze_with_model(message: str) -> AnalysisResult:
    """Default analyzer: one structured-output call, then schema validation. Raises AIServiceError on any failure."""
    return parse_model_output(generate_text(INSTRUCTIONS, message, text_format=OUTPUT_FORMAT))
