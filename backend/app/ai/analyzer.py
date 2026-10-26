"""Validated AI analyzer: calls the model with the prompt and output schema, and validates its JSON (see docs/requirements.md, AI contract)."""

from dataclasses import dataclass

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.ai.client import generate_text
from app.ai.errors import AIServiceError
from app.ai.prompt import INSTRUCTIONS, OUTPUT_FORMAT, IndicatorType, ModelRiskLevel
from app.models import AnalysisResult, Indicator, Topic


@dataclass(frozen=True)
class AnalyzedMessage:
    """Internal analyzer output: the result plus the fields used only to store shared critical messages."""

    result: AnalysisResult
    topic: Topic
    masked_message: str  # Best effort; the backend masking always runs on top of it.


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
    topic: Topic
    masked_message: str = Field(alias="maskedMessage")


def parse_model_output(text: str) -> AnalyzedMessage:
    """Validate the model JSON; raise AIServiceError if it is not JSON or does not match the schema."""
    try:
        output = _ModelOutput.model_validate_json(text)
    except ValidationError as error:
        raise AIServiceError("Model returned invalid output") from error
    result = AnalysisResult(
        risk_level=output.risk_level,
        summary=output.summary,
        explanation=output.explanation,
        indicators=[
            Indicator(type=item.type, title=item.title, description=item.description, evidence=item.evidence)
            for item in output.indicators
        ],
    )
    return AnalyzedMessage(result=result, topic=output.topic, masked_message=output.masked_message)


def analyze_with_model(message: str) -> AnalyzedMessage:
    """Default analyzer: one structured-output call, then schema validation. Raises AIServiceError on any failure."""
    return parse_model_output(generate_text(INSTRUCTIONS, message, text_format=OUTPUT_FORMAT))
