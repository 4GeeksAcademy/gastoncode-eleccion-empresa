import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine

os.environ.setdefault("JWT_SECRET", "inventory-test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://test:test@localhost/test")
sys.path.insert(0, str(Path(__file__).parents[1]))

from database import get_session  # noqa: E402
from main import app  # noqa: E402
from models import Ingredient  # noqa: E402
from auth import get_current_user  # noqa: E402


@pytest.fixture

def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        ingredient = Ingredient(name="Falda", sku="BEEF-1", unit="kg", category="meat", country="CO")
        session.add(ingredient)
        session.commit()
        session.refresh(ingredient)

    def override_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: {"id": "fixture-user-uuid", "role": "admin"}
    # Avoid app lifespan setup against the placeholder PostgreSQL URL.
    yield TestClient(app)
    app.dependency_overrides.clear()
    SQLModel.metadata.drop_all(engine)
    engine.dispose()
