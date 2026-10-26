"""HTTP endpoints. Thin: validate input via models, call the service, return the response model."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.models import CriticalMessagesResponse, MessageAnalysisRequest, MessageAnalysisResponse
from app.services.analysis import Analyzer, MessageSaver, analyze_message, get_analyzer, get_message_saver
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


@router.get("/critical-messages", response_model=CriticalMessagesResponse)
def list_critical_messages() -> CriticalMessagesResponse:
    return get_critical_messages()
