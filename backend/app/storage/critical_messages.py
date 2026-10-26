"""SQLite persistence of shared critical messages (see docs/requirements.md, Critical messages storage)."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.models import CriticalMessage, Topic
from app.normalization import duplicate_key

# Resolved from this file, not the working directory: the Makefile runs uvicorn from backend/.
DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "scamguard.db"

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS critical_messages (
    id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,
    text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    times_shared INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    last_shared_at TEXT NOT NULL,
    UNIQUE (topic, normalized_text)
)
"""


class StorageError(Exception):
    """Reading or writing the critical messages DB failed. GET /critical-messages maps it to 503."""


@dataclass(frozen=True)
class StoredTopic:
    topic: str  # Validated against Topic when the service builds the response.
    times_shared: int  # Total times its messages were shared.
    messages: list[CriticalMessage]  # Each message once, most recently shared first; never empty.


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


# US-3.4: a message already stored in the topic is counted again instead of duplicated.
# The text and created_at of the first share are kept.
_UPSERT = """
INSERT INTO critical_messages (topic, text, normalized_text, times_shared, created_at, last_shared_at)
VALUES (?, ?, ?, 1, ?, ?)
ON CONFLICT (topic, normalized_text) DO UPDATE SET
    times_shared = times_shared + 1,
    last_shared_at = excluded.last_shared_at
"""


def save_critical_message(topic: Topic, text: str) -> None:
    """Store an already masked message; the caller never passes the original text."""
    shared_at = datetime.now(UTC).isoformat(timespec="microseconds")
    with _connect() as connection:
        connection.execute(_UPSERT, (topic, text, duplicate_key(text), shared_at, shared_at))


def list_critical_topics() -> list[StoredTopic]:
    """One group per topic: most shared first, ties by most recent share; messages most recently shared first."""
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, topic, text, times_shared FROM critical_messages ORDER BY last_shared_at DESC, id DESC"
        ).fetchall()

    groups: dict[str, list[CriticalMessage]] = {}
    for message_id, topic, text, times_shared in rows:
        groups.setdefault(topic, []).append(CriticalMessage(id=message_id, text=text, times_shared=times_shared))
    topics = [
        StoredTopic(topic=topic, times_shared=sum(message.times_shared for message in messages), messages=messages)
        for topic, messages in groups.items()
    ]
    # Groups are created in order of their most recent share; the stable sort keeps that order for ties.
    return sorted(topics, key=lambda stored: stored.times_shared, reverse=True)
