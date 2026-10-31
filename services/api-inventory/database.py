import os
from collections.abc import Generator
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine


load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está configurada para la base PostgreSQL de inventario")

# Supabase PostgreSQL requires TLS; preserve an explicitly provided sslmode.
url = make_url(DATABASE_URL)
if url.drivername in {"postgres", "postgresql"}:
    url = url.set(drivername="postgresql+psycopg")
if url.drivername.startswith("postgresql") and "sslmode" not in url.query:
    url = url.update_query_dict({"sslmode": "require"})

engine = create_engine(url, pool_pre_ping=True)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
