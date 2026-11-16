"""Inventory database — PostgreSQL via SQLModel (SQLite fallback for tests)."""

import os

from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está configurada para la base PostgreSQL de inventario")

url = make_url(DATABASE_URL)

# PostgreSQL with psycopg
if url.drivername in {"postgres", "postgresql"}:
    url = url.set(drivername="postgresql+psycopg")
    if "sslmode" not in url.query:
        url = url.update_query_dict({"sslmode": "require"})
    engine = create_engine(url, pool_pre_ping=True)
else:
    # SQLite (dev/tests)
    engine = create_engine(url, echo=False)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
