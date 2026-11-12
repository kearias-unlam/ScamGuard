"""Business logic for the analysis history (Feature 10; see docs/requirements.md, Analysis history storage)."""

import logging
from collections.abc import Callable

from app.auth import User
from app.models import HistoryEntry, HistoryEntryKind, HistoryResponse, MessageAnalysisResponse
from app.storage import history as history_storage
from app.storage.database import StorageError

logger = logging.getLogger(__name__)

# Free version: at most 3 entries per user. Returned by GET /history (#107) and enforced by #109.
HISTORY_LIMIT = 3
TITLE_MAX_CHARS = 80
TITLE_ELLIPSIS = "…"

# Stores one entry for the user; raises StorageError on any failure.
HistorySaver = Callable[[str, HistoryEntryKind, str, MessageAnalysisResponse], object]


class HistoryUnavailableError(Exception):
    """The history could not be read. main.py maps it to 503 with the history text."""


class HistoryEntryNotFoundError(Exception):
    """The entry does not exist or belongs to another user. main.py maps it to 404."""


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
    user: User | None, kind: HistoryEntryKind, response: MessageAnalysisResponse, save: HistorySaver
) -> None:
    """Save a successful analysis for a signed-in user. Without a user nothing is saved.
    A storage failure is logged and never changes the analysis response."""
    if user is None:
        return
    try:
        save(user.id, kind, build_history_title(response.result.summary), response)
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
