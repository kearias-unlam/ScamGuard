"""Business logic for the analysis history (Feature 10; see docs/requirements.md, Analysis history storage)."""

import logging
from collections.abc import Callable

from fastapi import Depends

from app.auth import User, get_current_user
from app.models import HistoryEntry, HistoryEntryKind, HistoryResponse, MessageAnalysisResponse
from app.storage import history as history_storage
from app.storage.database import StorageError

logger = logging.getLogger(__name__)

# Free version: at most 3 entries per user. Returned by GET /history (#107) and enforced by #109.
HISTORY_LIMIT = 3
TITLE_MAX_CHARS = 80
TITLE_ELLIPSIS = "…"

# Stores one entry for the user (user id, kind, title, response, analyzed input); raises StorageError on any failure.
HistorySaver = Callable[[str, HistoryEntryKind, str, MessageAnalysisResponse, str], object]


class HistoryUnavailableError(Exception):
    """The history could not be read. main.py maps it to 503 with the history text."""


class HistoryEntryNotFoundError(Exception):
    """The entry does not exist or belongs to another user. main.py maps it to 404."""


class HistoryFullError(Exception):
    """US-10.2: the user's history is full. main.py maps it to 409 with the history full text."""


def ensure_history_not_full(user: User | None = Depends(get_current_user)) -> None:
    """US-10.2: dependency of the three analysis endpoints, resolved before the AI is called.
    Without a user there is no limit. If counting fails, the error is logged and the analysis goes on:
    the later save fails too, so the limit cannot really be exceeded."""
    if user is None:
        return
    try:
        count = history_storage.count_history_entries(user.id)
    except StorageError as error:
        logger.warning("History count failed; the analysis is not blocked: %s", error)
        return
    if count >= HISTORY_LIMIT:
        raise HistoryFullError(user.id)


def get_history_saver() -> HistorySaver:
    """FastAPI dependency provider; tests override it with a recorder or a failing saver."""
    return history_storage.save_history_entry


def build_history_title(summary: str) -> str:
    """The summary, trimmed; when longer than 80 characters, the first 80 (trailing spaces removed) plus "…"."""
    title = summary.strip()
    if len(title) <= TITLE_MAX_CHARS:
        return title
    return title[:TITLE_MAX_CHARS].rstrip() + TITLE_ELLIPSIS


def record_analysis(
    user: User | None,
    kind: HistoryEntryKind,
    response: MessageAnalysisResponse,
    analyzed_input: str,
    save: HistorySaver,
) -> None:
    """Save a successful analysis for a signed-in user, with what was analyzed (US-10.3). Without a user nothing is
    saved. A storage failure is logged and never changes the analysis response."""
    if user is None:
        return
    try:
        save(user.id, kind, build_history_title(response.result.summary), response, analyzed_input)
    except StorageError as error:
        logger.warning("History entry not saved: %s", error)  # Internal cause only; never sent to the client.


def get_history(user: User) -> HistoryResponse:
    try:
        entries = history_storage.list_history_entries(user.id)
    except StorageError as error:
        raise HistoryUnavailableError(str(error)) from error
    return HistoryResponse(entries=entries, limit=HISTORY_LIMIT, is_full=len(entries) >= HISTORY_LIMIT)


def get_history_entry(user: User, entry_id: int) -> HistoryEntry:
    try:
        entry = history_storage.get_history_entry(user.id, entry_id)
    except StorageError as error:
        raise HistoryUnavailableError(str(error)) from error
    if entry is None:
        raise HistoryEntryNotFoundError(str(entry_id))
    return entry


def delete_history_entry(user: User, entry_id: int) -> None:
    """US-10.2: delete one of the user's entries permanently."""
    try:
        deleted = history_storage.delete_history_entry(user.id, entry_id)
    except StorageError as error:
        raise HistoryUnavailableError(str(error)) from error
    if not deleted:
        raise HistoryEntryNotFoundError(str(entry_id))
