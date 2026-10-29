"""Pydantic request/response models for POST /analysis, POST /analysis/email, POST /analysis/url, and
GET /critical-messages (mirror of src/types.ts)."""

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


# US-4.2: largest accepted .eml content (docs/requirements.md, API contract).
MAX_EMAIL_CONTENT_CHARS = 1_000_000

# US-6.2: longest accepted link (docs/requirements.md, API contract).
MAX_URL_CHARS = 2_000


def _require_non_blank(value: str, field: str) -> str:
    if not value.strip():
        raise ValueError(f"{field} must not be empty or whitespace-only")
    return value


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
        return _require_non_blank(value, "message")  # Keep the original text; the evidence check compares against it.


class EmailAnalysisRequest(CamelModel):
    email_content: str  # US-4.2: raw .eml file content.

    @field_validator("email_content")
    @classmethod
    def reject_blank_or_too_large(cls, value: str) -> str:
        if len(value) > MAX_EMAIL_CONTENT_CHARS:
            raise ValueError(f"emailContent must have at most {MAX_EMAIL_CONTENT_CHARS} characters")
        return _require_non_blank(value, "emailContent")


class UrlAnalysisRequest(CamelModel):
    url: str  # US-6.2: one link as pasted by the user.

    @field_validator("url")
    @classmethod
    def reject_blank_or_too_long(cls, value: str) -> str:
        if len(value) > MAX_URL_CHARS:
            raise ValueError(f"url must have at most {MAX_URL_CHARS} characters")
        return _require_non_blank(value, "url")


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
