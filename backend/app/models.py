"""Pydantic request/response models for POST /analysis (mirror of src/types.ts)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "UNDETERMINED"]


class CamelModel(BaseModel):
    """snake_case in Python, camelCase in JSON. Accepts both on input; FastAPI serializes by alias."""

    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True, validate_by_alias=True)


class Indicator(CamelModel):
    type: str
    title: str
    description: str
    evidence: str


class AnalysisResult(CamelModel):
    risk_level: RiskLevel
    summary: str
    explanation: str
    indicators: list[Indicator]


class MessageAnalysisRequest(CamelModel):
    message: str

    @field_validator("message")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message must not be empty or whitespace-only")
        return value  # Keep the original text; the evidence check compares against it.


class MessageAnalysisResponse(CamelModel):
    result: AnalysisResult
