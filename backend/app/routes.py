"""HTTP endpoints. Thin: validate input via models, call the service, return the response model."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.models import (
    CriticalMessagesResponse,
    EmailAnalysisRequest,
    MessageAnalysisRequest,
    MessageAnalysisResponse,
    UrlAnalysisRequest,
)
from app.services.analysis import (
    Analyzer,
    MessageSaver,
    analyze_email,
    analyze_message,
    analyze_url,
    get_analyzer,
    get_message_saver,
)
from app.services.critical_messages import get_critical_messages

router = APIRouter()


@router.post("/analysis", response_model=MessageAnalysisResponse)
def post_analysis(
    request: MessageAnalysisRequest,
    analyzer: Annotated[Analyzer, Depends(get_analyzer)],
    save: Annotated[MessageSaver, Depends(get_message_saver)],
) -> MessageAnalysisResponse:
    result = analyze_message(
        request.message,
        analyzer,
        share_in_panel=request.share_in_panel,
        sensitive_data=request.sensitive_data,
        save=save,
    )
    return MessageAnalysisResponse(result=result)


# US-4.2: no saver dependency, so an email can never be stored.
@router.post("/analysis/email", response_model=MessageAnalysisResponse)
def post_email_analysis(
    request: EmailAnalysisRequest,
    analyzer: Annotated[Analyzer, Depends(get_analyzer)],
) -> MessageAnalysisResponse:
    return MessageAnalysisResponse(result=analyze_email(request.email_content, analyzer))


# US-6.2: no saver dependency, so a link can never be stored.
@router.post("/analysis/url", response_model=MessageAnalysisResponse)
def post_url_analysis(
    request: UrlAnalysisRequest,
    analyzer: Annotated[Analyzer, Depends(get_analyzer)],
) -> MessageAnalysisResponse:
    return MessageAnalysisResponse(result=analyze_url(request.url, analyzer))


@router.get("/critical-messages", response_model=CriticalMessagesResponse)
def list_critical_messages() -> CriticalMessagesResponse:
    return get_critical_messages()
