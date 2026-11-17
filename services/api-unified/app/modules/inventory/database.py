"""Inventory database — PostgreSQL via SQLModel (SQLite fallback for tests).

DATABASE_URL validation is deferred: the module-level engine is initialised
lazily so that importing this module never fails when DATABASE_URL is unset.
Callers that actually use the database are responsible for providing a valid URL.
"""

from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine

load_dotenv()

_engine: Any = None  # type: ignore[explicit-any]


def _get_engine() -> Any:
    """Return the lazily-initialised engine, raising if DATABASE_URL is unset."""
    global _engine
    if _engine is not None:
        return _engine

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL no está configurada para la base PostgreSQL de inventario"
        )

    url = make_url(database_url)

    # PostgreSQL with psycopg
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+psycopg")
        if "sslmode" not in url.query:
            url = url.update_query_dict({"sslmode": "require"})
        _engine = create_engine(url, pool_pre_ping=True)
    else:
        # SQLite (dev/tests)
        _engine = create_engine(url, echo=False)

    return _engine


def create_db_and_tables() -> None:
    """Create tables if DATABASE_URL is set; no-op otherwise."""
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return
    SQLModel.metadata.create_all(_get_engine())


def get_session():
    with Session(_get_engine()) as session:
        yield session
