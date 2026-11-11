# US-9.1 (#103): optional user from the session token.
import time

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.auth import User, get_current_user

SECRET = "test-secret-with-enough-length-for-hs256"


@pytest.fixture
def auth_client(monkeypatch) -> TestClient:
    monkeypatch.setenv("SCAMGUARD_JWT_SECRET", SECRET)
    test_app = FastAPI()

    @test_app.get("/whoami")
    def whoami(user: User | None = Depends(get_current_user)) -> dict[str, str | None]:
        return {"userId": user.id if user else None}

    return TestClient(test_app)


def _token(secret: str = SECRET, sub: str = "google:1234", exp_offset: int = 3600) -> str:
    return jwt.encode({"sub": sub, "exp": int(time.time()) + exp_offset}, secret, algorithm="HS256")


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_no_header_is_anonymous(auth_client: TestClient) -> None:
    response = auth_client.get("/whoami")

    assert response.status_code == 200
    assert response.json() == {"userId": None}


def test_valid_token_gives_the_user(auth_client: TestClient) -> None:
    response = auth_client.get("/whoami", headers=_bearer(_token()))

    assert response.status_code == 200
    assert response.json() == {"userId": "google:1234"}


def test_expired_token_is_401(auth_client: TestClient) -> None:
    response = auth_client.get("/whoami", headers=_bearer(_token(exp_offset=-60)))

    assert response.status_code == 401


def test_wrong_signature_is_401(auth_client: TestClient) -> None:
    response = auth_client.get("/whoami", headers=_bearer(_token(secret="another-secret-with-enough-length-for-hs256")))

    assert response.status_code == 401


def test_token_without_sub_is_401(auth_client: TestClient) -> None:
    token = jwt.encode({"exp": int(time.time()) + 3600}, SECRET, algorithm="HS256")

    response = auth_client.get("/whoami", headers=_bearer(token))

    assert response.status_code == 401


def test_non_bearer_header_is_401(auth_client: TestClient) -> None:
    response = auth_client.get("/whoami", headers={"Authorization": f"Basic {_token()}"})

    assert response.status_code == 401


def test_missing_secret_with_a_token_is_401(auth_client: TestClient, monkeypatch) -> None:
    monkeypatch.delenv("SCAMGUARD_JWT_SECRET")

    response = auth_client.get("/whoami", headers=_bearer(_token()))

    assert response.status_code == 401
