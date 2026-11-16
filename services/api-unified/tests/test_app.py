"""Smoke tests for the unified app — standalone, no legacy loading."""

import os
from pathlib import Path
import tempfile

SERVICE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(tempfile.mkdtemp(prefix="brasaland-unified-tests-"))
os.environ.update(
    {
        "JWT_SECRET": "test-only-secret-not-for-production",
        "DATABASE_URL": f"sqlite:///{DATA_DIR / 'inventory.db'}",
        "AUTH_DB_PATH": str(DATA_DIR / "auth.json"),
        "SUPPLIERS_DB_PATH": str(DATA_DIR / "suppliers.json"),
        "ANALYSES_DB_PATH": str(DATA_DIR / "analyses.json"),
        "INCIDENTS_DB_PATH": str(DATA_DIR / "incidents.json"),
    }
)

_ORIGINAL_CWD = Path.cwd()
os.chdir(SERVICE_DIR)

from app.main import create_app
app = create_app()

os.chdir(_ORIGINAL_CWD)


def test_health_routes():
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        assert client.get("/").json() == {
            "status": "ok",
            "service": "brasaland-unified-api",
        }
        assert client.get("/health").json() == {
            "status": "healthy",
            "service": "brasaland-unified-api",
        }


def test_all_domain_routes_are_registered():
    from fastapi.testclient import TestClient

    expected_paths = {
        "/auth/login",
        "/auth/me",
        "/auth/users",
        "/auth/profiles/me",
        "/suppliers",
        "/api/incidents/incidents",
        "/api/incidents/analyze",
        "/inventory/products",
        "/talent/records",
    }
    with TestClient(app) as client:
        route_paths = set(client.get("/openapi.json").json()["paths"])
        assert expected_paths <= route_paths, f"Missing: {expected_paths - route_paths}"
        assert client.get("/openapi.json").status_code == 200


def test_auth_register_login_and_me():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        email = f"{uuid4().hex[:8]}@test.test"
        register = client.post("/auth/users", json={"email": email, "password": "SecurePass123!"})
        assert register.status_code in (200, 201), register.text
        user_id = register.json().get("user", register.json()).get("id")

        login = client.post("/auth/login", data={"username": email, "password": "SecurePass123!"})
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]

        me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200, me.text
        assert me.json()["id"] == user_id


def test_suppliers_crud():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        # Register
        email = f"{uuid4().hex[:8]}@sup.test"
        client.post("/auth/users", json={"email": email, "password": "Pass1234!"})
        token = client.post("/auth/login", data={"username": email, "password": "Pass1234!"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Users default to role "user", need admin for suppliers.
        # Promote via direct services call.
        from app.modules.auth.services import get_user_by_email, update_user
        user = get_user_by_email(email)
        user["role"] = "admin"
        update_user(user["id"], user)
        # Re-login with updated role
        token = client.post("/auth/login", data={"username": email, "password": "Pass1234!"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create supplier
        supplier = {
            "name": "Test Supplier",
            "country": "Colombia",
            "categories": ["carne"],
            "rate_per_unit": 10.5,
            "currency": "COP",
            "status": "active",
            "contact_email": "test@sup.co",
            "notes": "Test supplier",
        }
        created = client.post("/suppliers", json=supplier, headers=headers)
        assert created.status_code in (200, 201), created.text
        supplier_id = created.json()["id"]

        # List
        listed = client.get("/suppliers", headers=headers)
        assert listed.status_code == 200
        assert any(s["id"] == supplier_id for s in listed.json())

        # Get
        got = client.get(f"/suppliers/{supplier_id}", headers=headers)
        assert got.status_code == 200
        assert got.json()["name"] == "Test Supplier"

        # Update rate
        rate_resp = client.patch(f"/suppliers/{supplier_id}/rate", json={"rate_per_unit": 4.5}, headers=headers)
        assert rate_resp.status_code == 200, rate_resp.text

        # Delete
        del_resp = client.delete(f"/suppliers/{supplier_id}", headers=headers)
        assert del_resp.status_code == 200, del_resp.text


def test_incidents_crud():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        email = f"{uuid4().hex[:8]}@inc.test"
        client.post("/auth/users", json={"email": email, "password": "Pass1234!"})
        token = client.post("/auth/login", data={"username": email, "password": "Pass1234!"}).json()["access_token"]

        # Promote to admin
        from app.modules.auth.services import get_user_by_email, update_user
        user = get_user_by_email(email)
        user["role"] = "admin"
        update_user(user["id"], user)
        token = client.post("/auth/login", data={"username": email, "password": "Pass1234!"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        incident = {
            "title": "Test Incident",
            "description": "This is a test incident description",
            "category": "safety",
            "branch": "chapinero",
            "origin": "internal",
        }
        created = client.post("/api/incidents/incidents", json=incident, headers=headers)
        assert created.status_code == 201, created.text

        listed = client.get("/api/incidents/incidents", headers=headers)
        assert listed.status_code == 200
        assert len(listed.json()) >= 1

        summary = client.get("/api/incidents/summary", headers=headers)
        assert summary.status_code == 200


def test_talent_auth_rejects_viewer():
    from uuid import uuid4

    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        email = f"{uuid4().hex[:8]}@viewer.test"
        client.post("/auth/users", json={"email": email, "password": "Pass1234!"})
        token = client.post("/auth/login", data={"username": email, "password": "Pass1234!"}).json()["access_token"]

        # Keep as "user" role (no promotion) — should be rejected by talent
        denied = client.get("/talent/records", headers={"Authorization": f"Bearer {token}"})
        assert denied.status_code == 403, denied.text
