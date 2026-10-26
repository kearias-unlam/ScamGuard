# US-3.1: GET /critical-messages. conftest.py points SCAMGUARD_DB_PATH to a temporary file.
from pathlib import Path
from typing import get_args

import pytest
from fastapi.testclient import TestClient

from app.models import Topic
from app.services.critical_messages import TOPIC_TITLES
from app.storage.critical_messages import save_critical_message

PANEL_DETAIL = "No se pudo cargar el panel. Intentá de nuevo más tarde."


def test_returns_grouped_topics_with_spanish_titles(client: TestClient) -> None:
    save_critical_message("bank_impersonation", "Su cuenta fue bloqueada, ingrese a [enlace].")
    save_critical_message("family_money_request", "Hola, soy [nombre], necesito plata urgente.")
    save_critical_message("family_money_request", "Ma, se me rompió el celu, pasame plata a [número].")

    response = client.get("/critical-messages")

    assert response.status_code == 200
    assert response.json() == {"topics": [
        {
            "topic": "family_money_request",
            "title": "Pedido de dinero de un familiar o conocido",
            "timesShared": 2,
            "messages": [
                {"id": 3, "text": "Ma, se me rompió el celu, pasame plata a [número].", "timesShared": 1},
                {"id": 2, "text": "Hola, soy [nombre], necesito plata urgente.", "timesShared": 1},
            ],
        },
        {
            "topic": "bank_impersonation",
            "title": "Suplantación de bancos o billeteras virtuales",
            "timesShared": 1,
            "messages": [{"id": 1, "text": "Su cuenta fue bloqueada, ingrese a [enlace].", "timesShared": 1}],
        },
    ]}


def test_empty_db_returns_no_topics(client: TestClient) -> None:
    response = client.get("/critical-messages")

    assert response.status_code == 200
    assert response.json() == {"topics": []}


def test_storage_error_returns_503_with_spanish_detail(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SCAMGUARD_DB_PATH", str(tmp_path))  # A directory cannot be opened as a DB.

    response = client.get("/critical-messages")

    assert response.status_code == 503
    assert response.json() == {"detail": PANEL_DETAIL}


def test_every_topic_has_a_title() -> None:
    assert set(TOPIC_TITLES) == set(get_args(Topic))
