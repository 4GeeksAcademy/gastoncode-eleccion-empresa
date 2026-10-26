import importlib
import hashlib
import logging
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
from jose import jwt


SERVICE = Path(__file__).resolve().parents[1]


class AuthApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        cls.database_path = Path(cls.directory.name) / "auth-test.json"
        cls.environment = patch.dict(os.environ, {
            "JWT_SECRET": "api-auth-test-secret-not-for-production",
            "AUTH_DB_PATH": str(cls.database_path),
            "FRONTEND_URL": "https://backoffice.example.test",
            "RESEND_API_KEY": "",
        })
        cls.environment.start()
        cls.dotenv = patch("dotenv.load_dotenv")
        cls.dotenv.start()
        sys.path.insert(0, str(SERVICE))

        # The service modules use top-level imports (auth, database, services).
        # Import them once against a temporary database isolated from local data.
        for module_name in ("main", "auth", "users", "profiles", "services", "database", "email_service"):
            sys.modules.pop(module_name, None)
        cls.app_module = importlib.import_module("main")
        cls.auth_module = importlib.import_module("auth")
        cls.database_module = importlib.import_module("database")
        cls.client = TestClient(cls.app_module.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.database_module.db.close()
        for module_name in ("main", "auth", "users", "profiles", "services", "database", "email_service"):
            sys.modules.pop(module_name, None)
        sys.path.remove(str(SERVICE))
        cls.dotenv.stop()
        cls.environment.stop()
        cls.directory.cleanup()

    def setUp(self):
        self.database_module.users_table.truncate()
        self.database_module.profiles_table.truncate()
        self.database_module.reset_tokens_table.truncate()

    def register(self, email="ana@example.com", password="clave-segura-123", **profile):
        response = self.client.post("/users", json={
            "email": email,
            "password": password,
            "name": profile.get("name", "Ana Test"),
            "phone": profile.get("phone", "+57 300 000 0000"),
            "address": profile.get("address", "Medellin"),
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def login(self, email="ana@example.com", password="clave-segura-123"):
        response = self.client.post("/auth/login", data={
            "username": email,
            "password": password,
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def headers(self, user, role=None):
        claims = {"sub": user["id"], "email": user["email"], "role": role or user["role"]}
        token = jwt.encode(claims, self.auth_module.JWT_SECRET, algorithm="HS256")
        return {"Authorization": f"Bearer {token}"}

    def test_register_creates_active_user_and_profile_without_exposing_hash(self):
        result = self.register()
        self.assertEqual(result["user"]["email"], "ana@example.com")
        self.assertEqual(result["user"]["role"], "user")
        self.assertTrue(result["user"]["is_active"])
        self.assertEqual(result["profile"]["user_id"], result["user"]["id"])
        self.assertNotIn("hashed_password", result["user"])
        self.assertNotIn("password", result["profile"])
        stored = self.database_module.users_table.all()[0]
        self.assertNotEqual(stored["hashed_password"], "clave-segura-123")

    def test_duplicate_registration_is_rejected_and_invalid_body_is_validated(self):
        self.register()
        duplicate = self.client.post("/users", json={
            "email": "ana@example.com", "password": "another-password"
        })
        invalid = self.client.post("/users", json={"email": "ana@example.com"})
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(len(self.database_module.users_table.all()), 1)

    def test_login_me_and_invalid_or_missing_credentials(self):
        registered = self.register()
        token = self.login()
        me = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        bad_password = self.client.post("/auth/login", data={
            "username": "ana@example.com", "password": "incorrecta"
        })
        missing_token = self.client.get("/auth/me")
        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(me.json()["id"], registered["user"]["id"])
        self.assertEqual(me.json()["profile"]["name"], "Ana Test")
        self.assertEqual(bad_password.status_code, 401)
        self.assertEqual(missing_token.status_code, 401)

    def test_disabled_accounts_cannot_login_or_reuse_existing_token(self):
        registered = self.register()
        token = self.login()
        self.database_module.users_table.update({"is_active": False})
        login = self.client.post("/auth/login", data={
            "username": "ana@example.com", "password": "clave-segura-123"
        })
        me = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(login.status_code, 401)
        self.assertEqual(me.status_code, 401)
        self.assertEqual(registered["user"]["role"], "user")

    def test_profile_endpoints_only_return_and_update_current_users_profile(self):
        first = self.register()
        token = self.login()
        other = self.register(email="otra@example.com", name="Otra Persona")
        profile = self.client.get("/profiles/me", headers={"Authorization": f"Bearer {token}"})
        updated = self.client.put("/profiles/me", headers={"Authorization": f"Bearer {token}"}, json={"name": "Ana Maria"})
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json()["user_id"], first["user"]["id"])
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["name"], "Ana Maria")
        self.assertEqual(self.database_module.profiles_table.all()[1]["name"], "Otra Persona")
        self.assertNotEqual(first["user"]["id"], other["user"]["id"])

    def test_updating_missing_profile_returns_not_found(self):
        registered = self.register()
        token = self.login()
        self.database_module.profiles_table.remove(
            lambda profile: profile["user_id"] == registered["user"]["id"]
        )
        response = self.client.put(
            "/profiles/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Updated"},
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Perfil no encontrado")

    def test_registration_rolls_back_user_when_profile_insert_fails(self):
        with patch.object(
            self.database_module.profiles_table,
            "insert",
            side_effect=OSError("disk unavailable"),
        ):
            with self.assertRaises(OSError):
                self.client.post("/users", json={
                    "email": "ana@example.com",
                    "password": "clave-segura-123",
                    "name": "Ana",
                })
        self.assertEqual(self.database_module.users_table.all(), [])
        self.assertEqual(self.database_module.profiles_table.all(), [])

    def test_user_listing_and_user_records_follow_role_and_owner_rules(self):
        own = self.register()
        other = self.register(email="otra@example.com")
        own_token = self.login()
        self.assertEqual(self.client.get("/users", headers={"Authorization": f"Bearer {own_token}"}).status_code, 403)
        self.assertEqual(self.client.get(f"/users/{other['user']['id']}", headers={"Authorization": f"Bearer {own_token}"}).status_code, 403)
        self.assertEqual(self.client.get(f"/users/{own['user']['id']}", headers={"Authorization": f"Bearer {own_token}"}).status_code, 200)

        self.database_module.users_table.update({"role": "manager"}, doc_ids=[self.database_module.users_table.all()[0].doc_id])
        manager_token = self.login()
        listing = self.client.get("/users", headers={"Authorization": f"Bearer {manager_token}"})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.json()), 2)
        self.assertNotIn("hashed_password", listing.json()[0])

    def test_only_admin_can_change_roles_or_account_status(self):
        user = self.register()
        user_token = self.login()
        forbidden_role = self.client.put(f"/users/{user['user']['id']}", headers={"Authorization": f"Bearer {user_token}"}, json={"role": "manager"})
        self.assertEqual(forbidden_role.status_code, 403)

        self.database_module.users_table.update({"role": "admin"}, doc_ids=[self.database_module.users_table.all()[0].doc_id])
        admin_token = self.login()
        changed = self.client.put(f"/users/{user['user']['id']}", headers={"Authorization": f"Bearer {admin_token}"}, json={"role": "manager", "is_active": False})
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(changed.json()["role"], "manager")
        self.assertFalse(changed.json()["is_active"])

    def test_forgot_password_response_does_not_reveal_account_existence(self):
        self.register()
        sent = []
        with patch.object(self.auth_module, "send_reset_email", side_effect=lambda **kwargs: sent.append(kwargs)):
            known = self.client.post("/auth/forgot-password", json={"email": "ana@example.com"})
            unknown = self.client.post("/auth/forgot-password", json={"email": "missing@example.com"})
        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.json(), unknown.json())
        self.assertEqual(len(sent), 1)
        reset_url = sent[0]["reset_url"]
        raw_token = parse_qs(urlparse(reset_url).query)["token"][0]
        self.assertTrue(reset_url.startswith("https://backoffice.example.test/reset-password?"))
        stored = self.database_module.reset_tokens_table.all()[0]
        self.assertNotEqual(stored["token_hash"], raw_token)
        self.assertEqual(len(stored["token_hash"]), 64)

    def test_forgot_password_keeps_generic_response_when_email_delivery_fails(self):
        self.register()
        with patch.object(self.auth_module, "send_reset_email", return_value=False):
            with self.assertLogs("api-auth.auth", level="WARNING") as captured:
                known = self.client.post(
                    "/auth/forgot-password", json={"email": "ana@example.com"}
                )
        unknown = self.client.post(
            "/auth/forgot-password", json={"email": "missing@example.com"}
        )
        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.json(), unknown.json())
        self.assertNotIn("ana@example.com", " ".join(captured.output))

    def test_reset_password_rejects_malformed_persisted_token(self):
        self.register()
        raw_token = "malformed-stored-token"
        self.database_module.reset_tokens_table.insert({
            "token_hash": hashlib.sha256(raw_token.encode()).hexdigest(),
            "user_id": "not-a-valid-user-id",
            "expires_at": "not-a-timestamp",
            "used": False,
        })
        response = self.client.post("/auth/reset-password", json={
            "token": raw_token,
            "password": "nueva-clave-123",
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "El enlace no es válido o ha expirado")

    def test_reset_password_rejects_naive_timestamp(self):
        self.register()
        raw_token = "naive-timestamp-token"
        self.database_module.reset_tokens_table.insert({
            "token_hash": hashlib.sha256(raw_token.encode()).hexdigest(),
            "user_id": self.database_module.users_table.all()[0]["id"],
            "expires_at": "2099-01-01T00:00:00",
            "used": False,
        })
        response = self.client.post("/auth/reset-password", json={
            "token": raw_token,
            "password": "nueva-clave-123",
        })
        self.assertEqual(response.status_code, 400)

    def test_reset_password_is_single_use_and_invalidates_pending_tokens(self):
        self.register()
        sent = []
        with patch.object(self.auth_module, "send_reset_email", side_effect=lambda **kwargs: sent.append(kwargs)):
            self.client.post("/auth/forgot-password", json={"email": "ana@example.com"})
            self.client.post("/auth/forgot-password", json={"email": "ana@example.com"})
        raw_token = parse_qs(urlparse(sent[0]["reset_url"]).query)["token"][0]
        reset = self.client.post("/auth/reset-password", json={"token": raw_token, "password": "nueva-clave-987"})
        reused = self.client.post("/auth/reset-password", json={"token": raw_token, "password": "otra-clave-987"})
        old_login = self.client.post("/auth/login", data={"username": "ana@example.com", "password": "clave-segura-123"})
        new_login = self.client.post("/auth/login", data={"username": "ana@example.com", "password": "nueva-clave-987"})
        self.assertEqual(reset.status_code, 200, reset.text)
        self.assertEqual(reused.status_code, 400)
        self.assertEqual(old_login.status_code, 401)
        self.assertEqual(new_login.status_code, 200)
        self.assertTrue(all(item["used"] for item in self.database_module.reset_tokens_table.all()))

    def test_reset_password_rejects_short_password_and_invalid_token(self):
        short = self.client.post("/auth/reset-password", json={"token": "missing", "password": "short"})
        invalid = self.client.post("/auth/reset-password", json={"token": "missing", "password": "long-enough"})
        self.assertEqual(short.status_code, 400)
        self.assertEqual(invalid.status_code, 400)

    def test_change_password_requires_current_password_and_invalidates_reset_tokens(self):
        registered = self.register()
        token = self.login()
        self.database_module.reset_tokens_table.insert({
            "token_hash": "pending-hash", "user_id": registered["user"]["id"],
            "expires_at": "2099-01-01T00:00:00+00:00", "used": False,
        })
        wrong = self.client.post("/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={"current_password": "incorrecta", "new_password": "nueva-clave-123"})
        short = self.client.post("/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={"current_password": "clave-segura-123", "new_password": "corta"})
        changed = self.client.post("/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={"current_password": "clave-segura-123", "new_password": "nueva-clave-123"})
        login = self.client.post("/auth/login", data={"username": "ana@example.com", "password": "nueva-clave-123"})
        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(short.status_code, 400)
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(login.status_code, 200)
        self.assertTrue(self.database_module.reset_tokens_table.all()[0]["used"])

    def test_password_write_is_not_attempted_if_reset_token_invalidation_fails(self):
        registered = self.register()
        token = self.login()
        with patch.object(
            self.database_module.reset_tokens_table,
            "update",
            side_effect=OSError("disk unavailable"),
        ):
            with self.assertRaises(OSError):
                self.client.post(
                    "/auth/change-password",
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "current_password": "clave-segura-123",
                        "new_password": "nueva-clave-123",
                    },
                )
        stored_user = self.database_module.users_table.get(
            lambda user: user["id"] == registered["user"]["id"]
        )
        self.assertTrue(self.auth_module.bcrypt.verify(
            "clave-segura-123", stored_user["hashed_password"]
        ))


if __name__ == "__main__":
    unittest.main()
