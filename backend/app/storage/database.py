"""Shared SQLite access for every storage module: DB path, connection, and StorageError
(see docs/requirements.md, Critical messages storage and Analysis history storage)."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

# Resolved from this file, not the working directory: the Makefile runs uvicorn from backend/.
DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "scamguard.db"


class StorageError(Exception):
    """Reading or writing the DB failed. Each caller maps it to its own 503 or logs it."""


def db_path() -> Path:
    """Read SCAMGUARD_DB_PATH on every call so tests can point it to a temporary file."""
    value = os.environ.get("SCAMGUARD_DB_PATH", "").strip()
    return Path(value) if value else DEFAULT_DB_PATH


@contextmanager
def connect(create_table_sql: str) -> Iterator[sqlite3.Connection]:
    """Open the DB, creating its folder and the caller's table on first use, and commit on success.
    Any sqlite3 or filesystem error becomes StorageError."""
    try:
        path = db_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path)
        try:
            with connection:  # Commits on success, rolls back on error.
                connection.execute(create_table_sql)
                yield connection
        finally:
            connection.close()
    except (sqlite3.Error, OSError) as error:
        raise StorageError(str(error)) from error
