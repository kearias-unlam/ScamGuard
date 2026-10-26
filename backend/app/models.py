"""Pydantic request/response models for POST /analysis and GET /critical-messages (mirror of src/types.ts)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "UNDETERMINED"]

# Fixed topic list (docs/requirements.md, AI contract).
Topic = Literal[
    "family_money_request",
    "bank_impersonation",
    "credentials_request",
    "prize_or_giveaway",
    "package_delivery",
    "investment_offer",
    "job_offer",
    "other",
]


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
    share_in_panel: bool = False  # US-3.3: optional, so a request with only the message stays valid.
    sensitive_data: str = ""

    @field_validator("message")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message must not be empty or whitespace-only")
        return value  # Keep the original text; the evidence check compares against it.


class MessageAnalysisResponse(CamelModel):
    result: AnalysisResult


class CriticalMessage(CamelModel):
    id: int
    text: str  # Masked text, never the original.
    times_shared: int  # US-3.4: times this message was shared; at least 1.


class CriticalTopic(CamelModel):
    topic: Topic
    title: str
    times_shared: int  # US-3.4: total times its messages were shared.
    messages: list[CriticalMessage]


class CriticalMessagesResponse(CamelModel):
    topics: list[CriticalTopic]
