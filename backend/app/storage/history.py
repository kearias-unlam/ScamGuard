"""SQLite persistence of the analysis history (see docs/requirements.md, Analysis history storage).

Every query filters by user_id: a user can never read or delete another user's entries.
Since US-10.3 what was analyzed is stored too (the message or link as sent, or the email digest), visible only to its
owner; the raw email file and sensitiveData never reach this module."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime

from app.models import HistoryEntry, HistoryEntryKind, HistoryEntrySummary, MessageAnalysisResponse
from app.storage.database import StorageError, connect

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS analysis_history (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    analysis_json TEXT NOT NULL,
    analyzed_input TEXT NOT NULL,
    created_at TEXT NOT NULL
)
"""

_SUMMARY_COLUMNS = "id, kind, title, created_at"


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    with connect(_CREATE_TABLE) as connection:
        yield connection


def _summary(row: tuple[int, str, str, str]) -> HistoryEntrySummary:
    entry_id, kind, title, created_at = row
    return HistoryEntrySummary(id=entry_id, kind=kind, title=title, created_at=created_at)


def save_history_entry(
    user_id: str, kind: HistoryEntryKind, title: str, analysis: MessageAnalysisResponse, analyzed_input: str
) -> HistoryEntrySummary:
    created_at = datetime.now(UTC).isoformat(timespec="microseconds")
    with _connect() as connection:
        cursor = connection.execute(
            "INSERT INTO analysis_history (user_id, kind, title, analysis_json, analyzed_input, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, kind, title, analysis.model_dump_json(by_alias=True), analyzed_input, created_at),
        )
        entry_id = cursor.lastrowid
    if entry_id is None:
        raise StorageError("The new history entry has no id")
    return HistoryEntrySummary(id=entry_id, kind=kind, title=title, created_at=created_at)


def list_history_entries(user_id: str) -> list[HistoryEntrySummary]:
    """The user's entries, most recent first."""
    with _connect() as connection:
        rows = connection.execute(
            f"SELECT {_SUMMARY_COLUMNS} FROM analysis_history WHERE user_id = ? ORDER BY created_at DESC, id DESC",
            (user_id,),
        ).fetchall()
    return [_summary(row) for row in rows]


def get_history_entry(user_id: str, entry_id: int) -> HistoryEntry | None:
    """None when the entry does not exist or belongs to another user."""
    with _connect() as connection:
        row = connection.execute(
            f"SELECT {_SUMMARY_COLUMNS}, analysis_json, analyzed_input FROM analysis_history WHERE id = ? AND user_id = ?",
            (entry_id, user_id),
        ).fetchone()
    if row is None:
        return None
    summary = _summary(row[:4])
    return HistoryEntry(
        **summary.model_dump(), analysis=MessageAnalysisResponse.model_validate_json(row[4]), analyzed_input=row[5]
    )


def delete_history_entry(user_id: str, entry_id: int) -> bool:
    """True when the user's entry was deleted; False when it does not exist or belongs to another user."""
    with _connect() as connection:
        cursor = connection.execute(
            "DELETE FROM analysis_history WHERE id = ? AND user_id = ?", (entry_id, user_id)
        )
    return cursor.rowcount > 0


def count_history_entries(user_id: str) -> int:
    with _connect() as connection:
        (count,) = connection.execute(
            "SELECT COUNT(*) FROM analysis_history WHERE user_id = ?", (user_id,)
        ).fetchone()
    return int(count)
