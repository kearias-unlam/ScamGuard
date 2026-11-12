# US-10.1 (#106): SQLite storage of the analysis history. conftest.py points SCAMGUARD_DB_PATH to a temporary file.
from pathlib import Path

import pytest

from app.models import AnalysisResult, MessageAnalysisResponse, Recommendation
from app.storage.critical_messages import list_critical_topics, save_critical_message
from app.storage.database import StorageError
from app.storage.history import (
    count_history_entries,
    delete_history_entry,
    get_history_entry,
    list_history_entries,
    save_history_entry,
)

ANA = "google:1"
BETO = "microsoft-entra-id:2"


def _analysis(summary: str = "Pide validar la cuenta") -> MessageAnalysisResponse:
    return MessageAnalysisResponse(
        result=AnalysisResult(risk_level="HIGH", summary=summary, explanation="e", indicators=[]),
        recommendations=[Recommendation(type="do_not_follow", text="No respondas.")],
    )


def test_save_and_list_most_recent_first_and_only_the_users_entries() -> None:
    first = save_history_entry(ANA, "message", "Primero", _analysis())
    save_history_entry(BETO, "url", "De otro usuario", _analysis())
    second = save_history_entry(ANA, "email", "Segundo", _analysis())

    entries = list_history_entries(ANA)

    assert [entry.id for entry in entries] == [second.id, first.id]
    assert [(entry.kind, entry.title) for entry in entries] == [("email", "Segundo"), ("message", "Primero")]
    assert entries[0].created_at >= entries[1].created_at


def test_get_own_entry_returns_the_full_analysis() -> None:
    analysis = _analysis("Resumen guardado")
    saved = save_history_entry(ANA, "message", "Resumen guardado", analysis)

    entry = get_history_entry(ANA, saved.id)

    assert entry is not None
    assert entry.id == saved.id
    assert entry.kind == "message"
    assert entry.analysis == analysis


def test_get_another_users_entry_returns_nothing() -> None:
    saved = save_history_entry(ANA, "message", "Privado", _analysis())

    assert get_history_entry(BETO, saved.id) is None
    assert get_history_entry(ANA, saved.id + 100) is None


def test_delete_only_the_users_own_entry() -> None:
    saved = save_history_entry(ANA, "message", "Borrable", _analysis())

    assert delete_history_entry(BETO, saved.id) is False
    assert count_history_entries(ANA) == 1

    assert delete_history_entry(ANA, saved.id) is True
    assert count_history_entries(ANA) == 0
    assert get_history_entry(ANA, saved.id) is None


def test_count_is_per_user() -> None:
    save_history_entry(ANA, "message", "a", _analysis())
    save_history_entry(ANA, "url", "b", _analysis())
    save_history_entry(BETO, "email", "c", _analysis())

    assert count_history_entries(ANA) == 2
    assert count_history_entries(BETO) == 1


def test_history_and_critical_messages_share_the_same_db_file() -> None:
    save_critical_message("other", "texto [enmascarado]")
    save_history_entry(ANA, "message", "t", _analysis())

    assert len(list_critical_topics()) == 1
    assert count_history_entries(ANA) == 1


def test_sqlite_error_becomes_storage_error(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SCAMGUARD_DB_PATH", str(tmp_path))  # A directory cannot be opened as a DB.

    with pytest.raises(StorageError):
        save_history_entry(ANA, "message", "t", _analysis())
    with pytest.raises(StorageError):
        list_history_entries(ANA)
