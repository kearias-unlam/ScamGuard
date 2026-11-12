"""HTTP endpoints. Thin: validate input via models, call the service, return the response model."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.auth import User, get_current_user, require_current_user
from app.models import (
    CriticalMessagesResponse,
    EmailAnalysisRequest,
    MessageAnalysisRequest,
    HistoryEntry,
    HistoryResponse,
    MessageAnalysisResponse,
    UrlAnalysisRequest,
)
from app.services.analysis import (
    Analyzer,
    MessageSaver,
    analyze_email,
    analyze_message,
    analyze_url,
    build_analysis_response,
    get_analyzer,
    get_message_saver,
)
from app.services.critical_messages import get_critical_messages
from app.services.history import (
    HistorySaver,
    delete_history_entry,
    ensure_history_not_full,
    get_history,
    get_history_entry,
    get_history_saver,
    record_analysis,
)

router = APIRouter()


# US-10.2: ensure_history_not_full answers 409 before the AI is called when the user's history is full.
@router.post("/analysis", response_model=MessageAnalysisResponse, dependencies=[Depends(ensure_history_not_full)])
def post_analysis(
    request: MessageAnalysisRequest,
    analyzer: Annotated[Analyzer, Depends(get_analyzer)],
    save: Annotated[MessageSaver, Depends(get_message_saver)],
    user: Annotated[User | None, Depends(get_current_user)],
    save_history: Annotated[HistorySaver, Depends(get_history_saver)],
) -> MessageAnalysisResponse:
    result = analyze_message(
        request.message,
        analyzer,
        share_in_panel=request.share_in_panel,
        sensitive_data=request.sensitive_data,
        save=save,
    )
    response = build_analysis_response(result)
    # US-10.1: only after a successful analysis. US-10.3: with the message as sent; sensitiveData is never saved.
    record_analysis(user, "message", response, request.message, save_history)
    return response


# US-4.2: no saver dependency, so an email is never shared in the panel; its result and digest (never the raw file)
# go to the user's history (US-10.1, US-10.3).
@router.post("/analysis/email", response_model=MessageAnalysisResponse, dependencies=[Depends(ensure_history_not_full)])
def post_email_analysis(
    request: EmailAnalysisRequest,
    analyzer: Annotated[Analyzer, Depends(get_analyzer)],
    user: Annotated[User | None, Depends(get_current_user)],
    save_history: Annotated[HistorySaver, Depends(get_history_saver)],
) -> MessageAnalysisResponse:
    analyzed = analyze_email(request.email_content, analyzer)
    response = build_analysis_response(analyzed.result)
    record_analysis(user, "email", response, analyzed.digest, save_history)
    return response


# US-6.2: no saver dependency, so a link is never shared in the panel; its result and the link as sent go to the
# user's history (US-10.1, US-10.3).
@router.post("/analysis/url", response_model=MessageAnalysisResponse, dependencies=[Depends(ensure_history_not_full)])
def post_url_analysis(
    request: UrlAnalysisRequest,
    analyzer: Annotated[Analyzer, Depends(get_analyzer)],
    user: Annotated[User | None, Depends(get_current_user)],
    save_history: Annotated[HistorySaver, Depends(get_history_saver)],
) -> MessageAnalysisResponse:
    response = build_analysis_response(analyze_url(request.url, analyzer))
    record_analysis(user, "url", response, request.url, save_history)
    return response


@router.get("/critical-messages", response_model=CriticalMessagesResponse)
def list_critical_messages() -> CriticalMessagesResponse:
    return get_critical_messages()


# US-10.1: the signed-in user's history; never another user's entries.
@router.get("/history", response_model=HistoryResponse)
def list_history(user: Annotated[User, Depends(require_current_user)]) -> HistoryResponse:
    return get_history(user)


@router.get("/history/{entry_id}", response_model=HistoryEntry)
def read_history_entry(entry_id: int, user: Annotated[User, Depends(require_current_user)]) -> HistoryEntry:
    return get_history_entry(user, entry_id)


# US-10.2: entries are deleted only by their owner; another user's entry is 404.
@router.delete("/history/{entry_id}", status_code=204)
def remove_history_entry(entry_id: int, user: Annotated[User, Depends(require_current_user)]) -> Response:
    delete_history_entry(user, entry_id)
    return Response(status_code=204)
