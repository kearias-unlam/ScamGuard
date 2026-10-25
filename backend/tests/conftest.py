import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Every test gets its own SQLite file; backend/data/ is never touched."""
    monkeypatch.setenv("SCAMGUARD_DB_PATH", str(tmp_path / "scamguard.db"))


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
