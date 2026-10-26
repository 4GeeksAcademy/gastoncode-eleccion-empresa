import importlib
import sys
from pathlib import Path
from unittest.mock import patch

import pytest


SERVICE = Path(__file__).resolve().parents[1]


@pytest.fixture

def api(monkeypatch, tmp_path):
    """Load the service against an isolated TinyDB without starting HTTP."""
    monkeypatch.setenv("JWT_SECRET", "pytest-api-auth-secret-not-for-production")
    monkeypatch.setenv("AUTH_DB_PATH", str(tmp_path / "auth-test.json"))
    monkeypatch.setenv("FRONTEND_URL", "https://backoffice.example.test")
    monkeypatch.setenv("RESEND_API_KEY", "")
    sys.path.insert(0, str(SERVICE))
    module_names = ("main", "auth", "users", "profiles", "services", "database", "email_service")
    for module_name in module_names:
        sys.modules.pop(module_name, None)

    # Prevent repository-local .env values from overriding the test environment.
    with patch("dotenv.load_dotenv", return_value=False):
        auth = importlib.import_module("auth")
        users = importlib.import_module("users")
        profiles = importlib.import_module("profiles")
        services = importlib.import_module("services")
        database = importlib.import_module("database")

    yield {
        "auth": auth,
        "users": users,
        "profiles": profiles,
        "services": services,
        "database": database,
    }

    database.db.close()
    for module_name in module_names:
        sys.modules.pop(module_name, None)
    if str(SERVICE) in sys.path:
        sys.path.remove(str(SERVICE))


@pytest.fixture

def user_factory(api):
    def create_user(email="ana@example.com", password="clave-segura-123", role="user", active=True, profile=True):
        from datetime import datetime, timezone
        from uuid import uuid4

        user_id = str(uuid4())
        user = {
            "id": user_id,
            "email": email,
            "hashed_password": api["users"].bcrypt.hash(password),
            "is_active": active,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "password_changed_at": None,
        }
        profile_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Ana Test",
            "phone": "+57 300 000 0000",
            "address": "Medellin",
        }
        if profile:
            api["services"].create_user(user, profile_data)
        else:
            api["database"].users_table.insert(user)
        return user, profile_data

    return create_user
