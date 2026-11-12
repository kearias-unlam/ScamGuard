# US-10.1 (#107): analyses of a signed-in user are saved; GET /history and GET /history/{id}.
import time
from collections.abc import Iterator
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient

from app.ai.analyzer import AnalyzedMessage
from app.ai.errors import AIServiceError
from app.main import app
from app.models import AnalysisResult, HistoryEntryKind, MessageAnalysisResponse
from app.services.analysis import get_analyzer
from app.services.history import HISTORY_LIMIT, build_history_title, get_history_saver
from app.storage.database import StorageError
from app.storage.history import list_history_entries, save_history_entry

SECRET = "test-secret-with-enough-length-for-hs256"
ANA = "google:1"
BETO = "microsoft-entra-id:2"
SUMMARY = "Pide validar la cuenta bancaria desde un link."
HISTORY_UNAVAILABLE_DETAIL = "No se pudo cargar el historial. Intentá de nuevo más tarde."
EMAIL = "From: banco@example.com\nSubject: Aviso\n\nValidá tu cuenta hoy."


@pytest.fixture(autouse=True)
def session_secret(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("SCAMGUARD_JWT_SECRET", SECRET)
    app.dependency_overrides[get_analyzer] = lambda: _stub
    yield
    app.dependency_overrides.clear()


def _stub(message: str) -> AnalyzedMessage:
    result = AnalysisResult(risk_level="LOW", summary=SUMMARY, explanation="Sin señales.", indicators=[])
    return AnalyzedMessage(result=result, topic="other", masked_message="")


def _auth(user_id: str = ANA) -> dict[str, str]:
    token = jwt.encode({"sub": user_id, "exp": int(time.time()) + 3600}, SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _analysis(summary: str = SUMMARY) -> MessageAnalysisResponse:
    return MessageAnalysisResponse(
        result=AnalysisResult(risk_level="LOW", summary=summary, explanation="e", indicators=[]),
        recommendations=[],
    )


@pytest.mark.parametrize(
    ("path", "body", "kind"),
    [
        ("/analysis", {"message": "Validá tu cuenta"}, "message"),
        ("/analysis/email", {"emailContent": EMAIL}, "email"),
        ("/analysis/url", {"url": "https://banco-seguro.example.com/validar"}, "url"),
    ],
)
def test_an_analysis_with_a_user_is_saved_with_its_kind_and_title(
    client: TestClient, path: str, body: dict[str, str], kind: HistoryEntryKind
) -> None:
    response = client.post(path, json=body, headers=_auth())

    assert response.status_code == 200
    entries = list_history_entries(ANA)
    assert [(entry.kind, entry.title) for entry in entries] == [(kind, SUMMARY)]


def test_the_saved_entry_holds_the_response_as_returned(client: TestClient) -> None:
    response = client.post("/analysis", json={"message": "Validá tu cuenta"}, headers=_auth())
    entry_id = list_history_entries(ANA)[0].id

    entry = client.get(f"/history/{entry_id}", headers=_auth())

    assert entry.status_code == 200
    assert entry.json()["analysis"] == response.json()
    assert entry.json()["kind"] == "message"


def test_without_a_user_nothing_is_saved(client: TestClient) -> None:
    response = client.post("/analysis", json={"message": "Validá tu cuenta"})

    assert response.status_code == 200
    assert list_history_entries(ANA) == []


def test_a_failed_analysis_is_not_saved(client: TestClient) -> None:
    def failing(message: str) -> AnalyzedMessage:
        raise AIServiceError("timeout")

    app.dependency_overrides[get_analyzer] = lambda: failing
    response = client.post("/analysis", json={"message": "Validá tu cuenta"}, headers=_auth())

    assert response.status_code == 503
    assert list_history_entries(ANA) == []


def test_a_storage_error_on_save_still_returns_the_analysis(client: TestClient) -> None:
    def failing_saver(*_: object) -> None:
        raise StorageError("disk full")

    app.dependency_overrides[get_history_saver] = lambda: failing_saver
    response = client.post("/analysis", json={"message": "Validá tu cuenta"}, headers=_auth())

    assert response.status_code == 200
    assert response.json()["result"]["summary"] == SUMMARY


def test_an_invalid_token_is_401_and_the_ai_is_not_called(client: TestClient) -> None:
    def must_not_run(message: str) -> AnalyzedMessage:
        raise AssertionError("the AI must not be called")

    app.dependency_overrides[get_analyzer] = lambda: must_not_run
    response = client.post("/analysis", json={"message": "hola"}, headers={"Authorization": "Bearer not-a-jwt"})

    assert response.status_code == 401


def test_list_returns_the_users_entries_most_recent_first_with_the_limit(client: TestClient) -> None:
    first = save_history_entry(ANA, "message", "Primero", _analysis())
    save_history_entry(BETO, "url", "De otro usuario", _analysis())
    second = save_history_entry(ANA, "url", "Segundo", _analysis())

    response = client.get("/history", headers=_auth())

    assert response.status_code == 200
    body = response.json()
    assert [entry["id"] for entry in body["entries"]] == [second.id, first.id]
    assert set(body["entries"][0]) == {"id", "kind", "title", "createdAt"}
    assert body["limit"] == HISTORY_LIMIT
    assert body["isFull"] is False


def test_list_is_full_at_the_limit(client: TestClient) -> None:
    for index in range(HISTORY_LIMIT):
        save_history_entry(ANA, "message", f"Entrada {index}", _analysis())

    assert client.get("/history", headers=_auth()).json()["isFull"] is True


def test_another_users_entry_is_404(client: TestClient) -> None:
    saved = save_history_entry(BETO, "message", "Privado", _analysis())

    assert client.get(f"/history/{saved.id}", headers=_auth()).status_code == 404
    assert client.get(f"/history/{saved.id + 100}", headers=_auth()).status_code == 404


def test_history_without_a_user_is_401(client: TestClient) -> None:
    assert client.get("/history").status_code == 401
    assert client.get("/history/1").status_code == 401


def test_a_storage_error_on_read_is_503_with_the_history_text(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("SCAMGUARD_DB_PATH", str(tmp_path))  # A directory cannot be opened as a DB.

    for path in ("/history", "/history/1"):
        response = client.get(path, headers=_auth())
        assert response.status_code == 503
        assert response.json() == {"detail": HISTORY_UNAVAILABLE_DETAIL}


@pytest.mark.parametrize(
    ("summary", "title"),
    [
        ("  Resumen corto  ", "Resumen corto"),
        ("a" * 80, "a" * 80),
        ("a" * 81, "a" * 80 + "…"),
        ("a" * 79 + " b más texto", "a" * 79 + "…"),
    ],
)
def test_title_is_the_trimmed_summary_cut_to_80_characters(summary: str, title: str) -> None:
    assert build_history_title(summary) == title
