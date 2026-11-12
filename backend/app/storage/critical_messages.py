"""SQLite persistence of shared critical messages (see docs/requirements.md, Critical messages storage)."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime

from app.models import CriticalMessage, Topic
from app.normalization import duplicate_key
from app.storage.database import connect

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


@dataclass(frozen=True)
class StoredTopic:
    topic: str  # Validated against Topic when the service builds the response.
    times_shared: int  # Total times its messages were shared.
    messages: list[CriticalMessage]  # Each message once, most recently shared first; never empty.


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    with connect(_CREATE_TABLE) as connection:
        yield connection


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
