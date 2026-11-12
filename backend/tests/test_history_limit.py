# US-10.2 (#109): history limit (409 before the AI is called) and DELETE /history/{id}.
import time
from collections.abc import Iterator
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient

from app.ai.analyzer import AnalyzedMessage
from app.main import app
from app.models import AnalysisResult, MessageAnalysisResponse
from app.services.analysis import get_analyzer
from app.services.history import HISTORY_LIMIT
from app.storage import history as history_storage
from app.storage.database import StorageError
from app.storage.history import count_history_entries, list_history_entries, save_history_entry

SECRET = "test-secret-with-enough-length-for-hs256"
ANA = "google:1"
BETO = "microsoft-entra-id:2"
HISTORY_FULL_DETAIL = (
    "Llegaste al límite de 3 análisis de la versión gratuita. Eliminá uno del historial para hacer un análisis nuevo."
)
HISTORY_UNAVAILABLE_DETAIL = "No se pudo cargar el historial. Intentá de nuevo más tarde."
EMAIL = "From: banco@example.com\nSubject: Aviso\n\nValidá tu cuenta hoy."
ANALYSIS_REQUESTS = [
    ("/analysis", {"message": "Validá tu cuenta"}),
    ("/analysis/email", {"emailContent": EMAIL}),
    ("/analysis/url", {"url": "https://banco-seguro.example.com/validar"}),
]


@pytest.fixture(autouse=True)
def session_secret(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("SCAMGUARD_JWT_SECRET", SECRET)
    app.dependency_overrides[get_analyzer] = lambda: _stub
    yield
    app.dependency_overrides.clear()


def _stub(message: str) -> AnalyzedMessage:
    result = AnalysisResult(risk_level="LOW", summary="Resumen nuevo", explanation="Sin señales.", indicators=[])
    return AnalyzedMessage(result=result, topic="other", masked_message="")


def _must_not_run(message: str) -> AnalyzedMessage:
    raise AssertionError("the AI must not be called with a full history")


def _auth(user_id: str = ANA) -> dict[str, str]:
    token = jwt.encode({"sub": user_id, "exp": int(time.time()) + 3600}, SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def _fill_history(user_id: str = ANA) -> list[int]:
    analysis = MessageAnalysisResponse(
        result=AnalysisResult(risk_level="LOW", summary="s", explanation="e", indicators=[]), recommendations=[]
    )
    return [
        save_history_entry(user_id, "message", f"Entrada {index}", analysis, "texto analizado").id
        for index in range(HISTORY_LIMIT)
    ]


@pytest.mark.parametrize(("path", "body"), ANALYSIS_REQUESTS)
def test_a_fourth_analysis_is_409_and_the_ai_is_not_called(client: TestClient, path: str, body: dict[str, str]) -> None:
    _fill_history()
    app.dependency_overrides[get_analyzer] = lambda: _must_not_run

    response = client.post(path, json=body, headers=_auth())

    assert response.status_code == 409
    assert response.json() == {"detail": HISTORY_FULL_DETAIL}
    assert count_history_entries(ANA) == HISTORY_LIMIT


def test_another_users_full_history_does_not_block(client: TestClient) -> None:
    _fill_history(BETO)

    assert client.post("/analysis", json={"message": "hola"}, headers=_auth(ANA)).status_code == 200


def test_without_a_user_there_is_no_limit(client: TestClient) -> None:
    _fill_history()

    for _ in range(HISTORY_LIMIT + 1):
        assert client.post("/analysis", json={"message": "hola"}).status_code == 200


def test_a_failed_count_does_not_block_the_analysis(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def failing_count(user_id: str) -> int:
        raise StorageError("locked")

    monkeypatch.setattr(history_storage, "count_history_entries", failing_count)

    assert client.post("/analysis", json={"message": "hola"}, headers=_auth()).status_code == 200


def test_after_a_delete_the_next_analysis_is_saved(client: TestClient) -> None:
    ids = _fill_history()

    assert client.delete(f"/history/{ids[0]}", headers=_auth()).status_code == 204
    response = client.post("/analysis", json={"message": "hola"}, headers=_auth())

    assert response.status_code == 200
    titles = [entry.title for entry in list_history_entries(ANA)]
    assert titles[0] == "Resumen nuevo"
    assert "Entrada 0" not in titles
    assert len(titles) == HISTORY_LIMIT


def test_delete_returns_204_without_a_body(client: TestClient) -> None:
    (entry_id, *_) = _fill_history()

    response = client.delete(f"/history/{entry_id}", headers=_auth())

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/history/{entry_id}", headers=_auth()).status_code == 404


def test_deleting_another_users_or_a_missing_entry_is_404(client: TestClient) -> None:
    (other_id, *_) = _fill_history(BETO)

    assert client.delete(f"/history/{other_id}", headers=_auth(ANA)).status_code == 404
    assert client.delete(f"/history/{other_id + 100}", headers=_auth(ANA)).status_code == 404
    assert count_history_entries(BETO) == HISTORY_LIMIT


def test_delete_without_a_user_is_401(client: TestClient) -> None:
    assert client.delete("/history/1").status_code == 401


def test_delete_with_a_storage_error_is_503_with_the_history_text(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("SCAMGUARD_DB_PATH", str(tmp_path))  # A directory cannot be opened as a DB.

    response = client.delete("/history/1", headers=_auth())

    assert response.status_code == 503
    assert response.json() == {"detail": HISTORY_UNAVAILABLE_DETAIL}
