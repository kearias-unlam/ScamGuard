# US-3.1 and US-3.4: SQLite storage of critical messages. conftest.py points SCAMGUARD_DB_PATH to a temporary file.
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


def _message(message_id: int, text: str, times_shared: int = 1) -> CriticalMessage:
    return CriticalMessage(id=message_id, text=text, times_shared=times_shared)


def test_groups_by_topic_ordered_by_total_shares_then_most_recent_share() -> None:
    save_critical_message("family_money_request", "f1")
    save_critical_message("bank_impersonation", "b1")
    save_critical_message("family_money_request", "f2")
    save_critical_message("prize_or_giveaway", "p1")

    assert list_critical_topics() == [
        StoredTopic(topic="family_money_request", times_shared=2, messages=[_message(3, "f2"), _message(1, "f1")]),
        StoredTopic(topic="prize_or_giveaway", times_shared=1, messages=[_message(4, "p1")]),
        StoredTopic(topic="bank_impersonation", times_shared=1, messages=[_message(2, "b1")]),
    ]


def test_equal_timestamps_are_ordered_by_id() -> None:
    list_critical_topics()  # Creates the table.
    shared_at = "2026-01-01T00:00:00.000000+00:00"
    with sqlite3.connect(os.environ["SCAMGUARD_DB_PATH"]) as connection:
        connection.executemany(
            "INSERT INTO critical_messages (topic, text, normalized_text, times_shared, created_at, last_shared_at)"
            " VALUES (?, ?, ?, 1, ?, ?)",
            [("other", "first", "first", shared_at, shared_at), ("other", "second", "second", shared_at, shared_at)],
        )
    connection.close()

    assert list_critical_topics() == [
        StoredTopic(topic="other", times_shared=2, messages=[_message(2, "second"), _message(1, "first")]),
    ]


# US-3.4: duplicates are counted, not stored again.
def test_same_text_twice_is_one_message_shared_twice() -> None:
    save_critical_message("family_money_request", "Ma, pasame plata")
    save_critical_message("family_money_request", "Ma, pasame plata")

    assert list_critical_topics() == [
        StoredTopic(topic="family_money_request", times_shared=2, messages=[_message(1, "Ma, pasame plata", 2)]),
    ]


def test_case_and_spacing_differences_are_the_same_message_and_keep_the_first_text() -> None:
    save_critical_message("other", "Hola  MUNDO ")
    save_critical_message("other", "hola mundo")

    assert list_critical_topics() == [
        StoredTopic(topic="other", times_shared=2, messages=[_message(1, "Hola  MUNDO ", 2)]),
    ]



def test_texts_that_differ_only_in_the_placeholder_are_the_same_message() -> None:
    # The model hid the CBU once and left it for the number rule the other time.
    save_critical_message("family_money_request", "Transferime a este CBU: [dato oculto].")
    save_critical_message("family_money_request", "Transferime a este CBU: [número].")
    save_critical_message("family_money_request", "Transferime hoy a este CBU: [número].")

    assert list_critical_topics() == [
        StoredTopic(topic="family_money_request", times_shared=3, messages=[
            _message(2, "Transferime hoy a este CBU: [número]."),  # The upsert does not use an id.
            _message(1, "Transferime a este CBU: [dato oculto].", 2),
        ]),
    ]

def test_same_text_in_another_topic_is_a_separate_message() -> None:
    save_critical_message("family_money_request", "Pasame plata")
    save_critical_message("other", "Pasame plata")

    topics = list_critical_topics()
    assert [(stored.topic, stored.times_shared, len(stored.messages)) for stored in topics] == [
        ("other", 1, 1), ("family_money_request", 1, 1),
    ]


def test_topic_with_fewer_messages_but_more_shares_comes_first() -> None:
    save_critical_message("bank_impersonation", "b1")
    save_critical_message("bank_impersonation", "b2")
    for _ in range(3):
        save_critical_message("family_money_request", "f1")

    assert [(stored.topic, stored.times_shared) for stored in list_critical_topics()] == [
        ("family_money_request", 3), ("bank_impersonation", 2),
    ]


def test_sharing_again_moves_the_message_first_in_its_topic() -> None:
    save_critical_message("other", "A")
    save_critical_message("other", "B")
    save_critical_message("other", "A")

    assert list_critical_topics() == [
        StoredTopic(topic="other", times_shared=3, messages=[_message(1, "A", 2), _message(2, "B")]),
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
