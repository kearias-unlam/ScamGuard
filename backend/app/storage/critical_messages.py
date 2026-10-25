"""SQLite persistence of shared critical messages (see docs/requirements.md, Critical messages storage)."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.models import CriticalMessage, Topic

# Resolved from this file, not the working directory: the Makefile runs uvicorn from backend/.
DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "scamguard.db"

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS critical_messages (
    id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
)
"""


class StorageError(Exception):
    """Reading or writing the critical messages DB failed. GET /critical-messages maps it to 503."""


@dataclass(frozen=True)
class StoredTopic:
    topic: str  # Validated against Topic when the service builds the response.
    messages: list[CriticalMessage]  # Newest first; never empty.


def _db_path() -> Path:
    """Read SCAMGUARD_DB_PATH on every call so tests can point it to a temporary file."""
    value = os.environ.get("SCAMGUARD_DB_PATH", "").strip()
    return Path(value) if value else DEFAULT_DB_PATH


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    """Open the DB, creating its folder and table on first use, and commit on success.
    Any sqlite3 or filesystem error becomes StorageError."""
    try:
        path = _db_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path)
        try:
            with connection:  # Commits on success, rolls back on error.
                connection.execute(_CREATE_TABLE)
                yield connection
        finally:
            connection.close()
    except (sqlite3.Error, OSError) as error:
        raise StorageError(str(error)) from error


def save_critical_message(topic: Topic, text: str) -> None:
    """Store an already masked message; the caller never passes the original text."""
    created_at = datetime.now(UTC).isoformat(timespec="microseconds")
    with _connect() as connection:
        connection.execute(
            "INSERT INTO critical_messages (topic, text, created_at) VALUES (?, ?, ?)",
            (topic, text, created_at),
        )


def list_critical_topics() -> list[StoredTopic]:
    """One group per topic: most messages first, ties by newest message; messages newest first."""
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, topic, text FROM critical_messages ORDER BY created_at DESC, id DESC"
        ).fetchall()

    groups: dict[str, list[CriticalMessage]] = {}
    for message_id, topic, text in rows:
        groups.setdefault(topic, []).append(CriticalMessage(id=message_id, text=text))
    # Groups are created in order of their newest message; the stable sort keeps that order for ties.
    ordered = sorted(groups.items(), key=lambda group: len(group[1]), reverse=True)
    return [StoredTopic(topic=topic, messages=messages) for topic, messages in ordered]
