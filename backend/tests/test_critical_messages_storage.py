# US-3.1: SQLite storage of critical messages. conftest.py points SCAMGUARD_DB_PATH to a temporary file.
import os
import sqlite3
from pathlib import Path

import pytest

from app.models import CriticalMessage
from app.storage.critical_messages import (
    DEFAULT_DB_PATH,
    StorageError,
    StoredTopic,
    list_critical_topics,
    save_critical_message,
)


def test_empty_db_returns_no_topics_and_creates_the_file() -> None:
    assert list_critical_topics() == []
    assert Path(os.environ["SCAMGUARD_DB_PATH"]).is_file()


def test_groups_by_topic_ordered_by_count_then_newest_message() -> None:
    save_critical_message("family_money_request", "f1")
    save_critical_message("bank_impersonation", "b1")
    save_critical_message("family_money_request", "f2")
    save_critical_message("prize_or_giveaway", "p1")

    assert list_critical_topics() == [
        StoredTopic(topic="family_money_request", messages=[
            CriticalMessage(id=3, text="f2", times_shared=1), CriticalMessage(id=1, text="f1", times_shared=1),
        ]),
        StoredTopic(topic="prize_or_giveaway", messages=[CriticalMessage(id=4, text="p1", times_shared=1)]),
        StoredTopic(topic="bank_impersonation", messages=[CriticalMessage(id=2, text="b1", times_shared=1)]),
    ]


def test_equal_timestamps_are_ordered_by_id() -> None:
    list_critical_topics()  # Creates the table.
    with sqlite3.connect(os.environ["SCAMGUARD_DB_PATH"]) as connection:
        connection.executemany(
            "INSERT INTO critical_messages (topic, text, created_at) VALUES (?, ?, ?)",
            [("other", "first", "2026-01-01T00:00:00.000000+00:00"), ("other", "second", "2026-01-01T00:00:00.000000+00:00")],
        )
    connection.close()

    assert list_critical_topics() == [
        StoredTopic(topic="other", messages=[CriticalMessage(id=2, text="second", times_shared=1), CriticalMessage(id=1, text="first", times_shared=1)]),
    ]


def test_sqlite_error_becomes_storage_error(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SCAMGUARD_DB_PATH", str(tmp_path))  # A directory cannot be opened as a DB.

    with pytest.raises(StorageError):
        list_critical_topics()
    with pytest.raises(StorageError):
        save_critical_message("other", "texto")


def test_filesystem_error_becomes_storage_error(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    blocker = tmp_path / "not-a-folder"
    blocker.write_text("")
    monkeypatch.setenv("SCAMGUARD_DB_PATH", str(blocker / "scamguard.db"))  # Parent folder cannot be created.

    with pytest.raises(StorageError):
        list_critical_topics()


def test_default_path_is_backend_data_regardless_of_working_directory() -> None:
    assert DEFAULT_DB_PATH == Path(__file__).resolve().parents[1] / "data" / "scamguard.db"
