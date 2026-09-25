"""HTTP endpoints. Thin: validate input via models, call the service, return the response model."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.models import MessageAnalysisRequest, MessageAnalysisResponse
from app.services.analysis import Analyzer, analyze_message, get_analyzer

router = APIRouter()


@router.post("/analysis", response_model=MessageAnalysisResponse)
def post_analysis(
    request: MessageAnalysisRequest,
    analyzer: Annotated[Analyzer, Depends(get_analyzer)],
) -> MessageAnalysisResponse:
    return MessageAnalysisResponse(result=analyze_message(request.message, analyzer))
