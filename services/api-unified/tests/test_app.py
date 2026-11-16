"""Smoke tests for the unified app's route composition."""

import importlib.util
import os
from pathlib import Path
import tempfile
import sys

SERVICE_DIR = Path(__file__).resolve().parents[1]
ENTRYPOINT = SERVICE_DIR / "app" / "main.py"
TEST_DATA = tempfile.TemporaryDirectory(prefix="brasaland-unified-tests-")
DATA_DIR = Path(TEST_DATA.name)
os.environ.update(
    {
        "JWT_SECRET": "test-only-secret-not-for-production",
        "DATABASE_URL": f"sqlite:///{DATA_DIR / 'inventory.db'}",
        "AUTH_DB_PATH": str(DATA_DIR / "auth.json"),
        "SUPPLIERS_DB_PATH": str(DATA_DIR / "suppliers.json"),
        "ANALYSES_DB_PATH": str(DATA_DIR / "analyses.json"),
        "INCIDENTS_DB_PATH": str(DATA_DIR / "incidents.json"),
        "AUTH_SERVICE_URL": "http://127.0.0.1:8001",
    }
)
_ORIGINAL_CWD = Path.cwd()
try:
    os.chdir(SERVICE_DIR)
    SPEC = importlib.util.spec_from_file_location("unified_app_under_test", ENTRYPOINT)
    assert SPEC is not None and SPEC.loader is not None
    unified = importlib.util.module_from_spec(SPEC)
    sys.modules[SPEC.name] = unified
    SPEC.loader.exec_module(unified)
finally:
    os.chdir(_ORIGINAL_CWD)


def test_unified_health_routes():
    from fastapi.testclient import TestClient

    with TestClient(unified.app) as client:
        assert client.get("/").json() == {
            "status": "ok",
            "service": "brasaland-unified-api",
        }
        assert client.get("/health").json() == {
            "status": "healthy",
            "service": "brasaland-unified-api",
        }


def test_domain_routes_are_registered():
    from fastapi.testclient import TestClient

    expected_paths = {
        "/auth/login", "/auth/me", "/suppliers", "/api/incidents",
        "/inventory/products", "/talent/records",
    }
    with TestClient(unified.app) as client:
        route_paths = set(client.get("/openapi.json").json()["paths"])
        assert expected_paths <= route_paths
        assert client.get("/openapi.json").status_code == 200


def test_talent_auth_uses_central_role_guard():
    talent_domain = unified._DOMAIN_APPS[4]
    talent_dependency = talent_domain.modules["auth"].get_current_user
    role_guard = unified.app.dependency_overrides[talent_dependency]
    assert role_guard.__name__ == "role_checker"


def test_legacy_modules_are_kept_in_domain_registries():
    required_by_domain = {
        0: {"auth", "users", "profiles", "services", "database", "email_service"},
        1: {"auth", "database", "models", "routers"},
        2: {"auth", "models"},
        3: {"auth", "database", "models", "schemas", "routers"},
        4: {"auth", "models", "tracker"},
    }
    for index, domain in enumerate(unified._DOMAIN_APPS):
        assert domain.modules["main"] is not None
        assert domain.modules["auth"].__name__ == "auth"
        assert required_by_domain[index] <= set(domain.modules)
        assert f"brasaland_api_{('auth', 'suppliers', 'incidents', 'inventory', 'talent')[index]}_main.main" in domain.modules


def test_domain_storage_modules_are_distinct():
    auth_domain, suppliers_domain, incidents_domain, inventory_domain, talent_domain = unified._DOMAIN_APPS
    databases = [
        auth_domain.modules["database"],
        suppliers_domain.modules["database"],
        inventory_domain.modules["database"],
    ]
    assert len({id(database) for database in databases}) == len(databases)
    assert incidents_domain.modules["models"] is not inventory_domain.modules["models"]
    assert talent_domain.modules["models"] is not inventory_domain.modules["models"]


def test_legacy_apps_keep_their_own_dependency_objects():
    _, suppliers_domain, incidents_domain, inventory_domain, talent_domain = unified._DOMAIN_APPS
    for domain in (suppliers_domain, incidents_domain, inventory_domain):
        dependency = domain.modules["auth"].get_current_user
        assert dependency in unified.app.dependency_overrides
        assert unified.app.dependency_overrides[dependency] is unified._DOMAIN_APPS[0].modules["auth"].get_current_user
    assert talent_domain.modules["auth"].get_current_user in unified.app.dependency_overrides


def test_real_auth_token_reaches_domain_routes_and_talent_role_guard():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    auth_domain = unified._DOMAIN_APPS[0]
    auth = auth_domain.modules["auth"]
    auth_services = auth_domain.modules["services"]
    user_id = str(uuid4())
    admin = {
        "id": user_id,
        "email": f"{user_id}@example.test",
        "role": "admin",
        "is_active": True,
        "hashed_password": "not-used-by-this-test",
    }
    auth_services.create_user(
        admin,
        {"id": str(uuid4()), "user_id": user_id, "name": "Unified API Test"},
    )
    token = auth.create_access_token(user_id, admin["email"], admin)
    headers = {"Authorization": f"Bearer {token}"}

    with TestClient(unified.app) as client:
        assert client.get("/auth/me", headers=headers).status_code == 200
        for path in ("/suppliers", "/api/incidents", "/inventory/products"):
            response = client.get(path, headers=headers)
            assert response.status_code == 200, (path, response.text)
        assert client.get("/talent/records", headers=headers).status_code == 200

        viewer_id = str(uuid4())
        viewer = {**admin, "id": viewer_id, "role": "viewer"}
        auth_services.create_user(
            viewer,
            {"id": str(uuid4()), "user_id": viewer_id, "name": "Viewer"},
        )
        viewer_token = auth.create_access_token(viewer_id, viewer["email"], viewer)
        denied = client.get(
            "/talent/records",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert denied.status_code == 403