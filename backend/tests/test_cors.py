from fastapi.testclient import TestClient

FRONTEND_ORIGIN = "http://localhost:3000"


def _preflight(client: TestClient, origin: str):
    return client.options(
        "/analysis",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_cors_preflight_allows_frontend_origin(client: TestClient) -> None:
    response = _preflight(client, FRONTEND_ORIGIN)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]


def test_cors_preflight_rejects_other_origin(client: TestClient) -> None:
    response = _preflight(client, "http://evil.example")

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
