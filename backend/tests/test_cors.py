import pytest
from fastapi.testclient import TestClient

from app.main import get_frontend_origins

FRONTEND_ORIGIN = "http://localhost:3000"


def _preflight(client: TestClient, origin: str, path: str = "/analysis", method: str = "POST"):
    return client.options(
        path,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_cors_preflight_allows_frontend_origin(client: TestClient) -> None:
    response = _preflight(client, FRONTEND_ORIGIN)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]


# US-3.1: the panel reads GET /critical-messages from the frontend origin.
def test_cors_preflight_allows_get_for_critical_messages(client: TestClient) -> None:
    response = _preflight(client, FRONTEND_ORIGIN, path="/critical-messages", method="GET")

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
    assert "GET" in response.headers["access-control-allow-methods"]


def test_cors_preflight_rejects_other_origin(client: TestClient) -> None:
    response = _preflight(client, "http://evil.example")

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


# US-9.1 (#103): the frontend sends the session token in the Authorization header.
def test_cors_preflight_allows_authorization_header(client: TestClient) -> None:
    response = client.options(
        "/analysis",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization, content-type",
        },
    )

    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


# US-10.2 (#109): the frontend deletes history entries with DELETE and the session token.
def test_cors_preflight_allows_delete_for_history(client: TestClient) -> None:
    response = client.options(
        "/history/1",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert "DELETE" in response.headers["access-control-allow-methods"]
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


# Deployment: allowed origins come from SCAMGUARD_FRONTEND_ORIGINS, so localhost and a deployed frontend both work.
def test_frontend_origins_default_to_localhost(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SCAMGUARD_FRONTEND_ORIGINS", raising=False)

    assert get_frontend_origins() == [FRONTEND_ORIGIN]


def test_frontend_origins_read_comma_separated_list(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SCAMGUARD_FRONTEND_ORIGINS", " http://localhost:3000, https://scamguard.vercel.app/ ,")

    assert get_frontend_origins() == ["http://localhost:3000", "https://scamguard.vercel.app"]
