import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from jose import jwt

import auth
import main
import tracker


class TalentTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.environment = patch.dict(os.environ, {"JWT_SECRET": "talent-test-only"})
        self.environment.start()
        self.token = jwt.encode({"sub": "fixture-user"}, "talent-test-only", algorithm="HS256")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.identity = patch.object(auth, "urlopen")
        self.identity_mock = self.identity.start()
        self.set_role("manager")
        self.upstream = patch.object(main, "tracker_request")
        self.provider = self.upstream.start()
        self.provider.return_value = {"total": 0, "page": 1, "limit": 9, "data": []}

    def tearDown(self):
        self.upstream.stop()
        self.identity.stop()
        self.environment.stop()

    def set_role(self, role):
        self.identity_mock.return_value.__enter__.return_value = io.BytesIO(
            json.dumps({"id": "fixture-user", "role": role}).encode()
        )

    def test_authentication_and_roles(self):
        self.assertEqual(self.client.get("/talent/records").status_code, 401)
        self.assertEqual(self.client.get("/talent/records", headers={"Authorization": "Bearer invalid"}).status_code, 401)
        self.set_role("user")
        self.assertEqual(self.client.get("/talent/records", headers=self.headers).status_code, 403)
        self.provider.assert_not_called()
        for role in ("manager", "admin"):
            self.set_role(role)
            self.assertEqual(self.client.get("/talent/records", headers=self.headers).status_code, 200)

    def test_auth_outage_and_disabled_account(self):
        self.identity_mock.side_effect = URLError("private transport detail")
        response = self.client.get("/talent/records", headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private", response.text)
        self.provider.assert_not_called()
        self.identity_mock.side_effect = HTTPError("http://auth", 401, "disabled", {}, None)
        self.assertEqual(self.client.get("/talent/records", headers=self.headers).status_code, 401)

    def test_filters_and_validation(self):
        response = self.client.get("/talent/records?stage=review&status=received&search=Synthetic&page=2&limit=24", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.provider.assert_called_with("GET", "records?page=2&limit=24&status=received&stage=review&search=Synthetic")
        self.set_role("manager")
        self.assertEqual(self.client.get("/talent/records?stage=private-invalid", headers=self.headers).status_code, 422)
        self.set_role("manager")
        self.assertEqual(self.client.get("/talent/records?limit=1001", headers=self.headers).status_code, 422)

    def test_updates_and_notes(self):
        self.provider.return_value = None
        response = self.client.patch("/talent/records/demo", headers=self.headers, json={"stage": "review", "status": "in_progress"})
        self.assertEqual(response.status_code, 204)
        self.provider.assert_called_with("PATCH", "records/demo", {"stage": "review", "status": "in_progress"})
        self.set_role("manager")
        self.assertEqual(self.client.post("/talent/records/demo/notes", headers=self.headers, json={"content": "Synthetic note"}).status_code, 201)
        self.set_role("manager")
        self.assertEqual(self.client.delete("/talent/records/demo/notes/note-demo", headers=self.headers).status_code, 204)

    def test_response_validation_and_input_do_not_leak_data(self):
        self.provider.return_value = {"private": "upstream secret"}
        response = self.client.get("/talent/records", headers=self.headers)
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("secret", response.text)
        self.set_role("manager")
        response = self.client.post("/talent/records", headers=self.headers, json={"email": "private-value"})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("private-value", response.text)

    def test_provider_does_not_receive_identity_token(self):
        response = MagicMock()
        response.status = 200
        response.read.return_value = b'{}'
        with patch.object(tracker, "urlopen") as transport:
            transport.return_value.__enter__.return_value = response
            tracker.tracker_request("GET", "records")
            request = transport.call_args.args[0]
            self.assertIsNone(request.get_header("Authorization"))

    def test_candidate_creation_detail_and_notes_contract(self):
        candidate = {
            "id": "candidate-demo", "full_name": "Synthetic Candidate", "email": "synthetic@example.com",
            "phone": "0000000000", "position": "Cocina", "cv_url": "https://example.com/synthetic-cv",
            "experience_years": 2, "status": "received", "stage": "pending",
            "applied_at": "2026-11-10T10:00:00Z", "updated_at": "2026-11-10T10:00:00Z",
        }
        self.provider.return_value = {**candidate, "private_extra": "not exposed"}
        input_fields = ("full_name", "email", "phone", "position", "cv_url", "experience_years")
        response = self.client.post("/talent/records", headers=self.headers, json={field: candidate[field] for field in input_fields})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["id"], "candidate-demo")
        self.assertNotIn("private_extra", response.json())
        self.set_role("manager")
        response = self.client.get("/talent/records/candidate-demo", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], "synthetic@example.com")
        self.set_role("manager")
        self.provider.return_value = {"data": [{"id": "note-demo", "record_id": "candidate-demo", "content": "Synthetic note", "created_at": "2026-11-10T10:00:00Z"}]}
        response = self.client.get("/talent/records/candidate-demo/notes", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["content"], "Synthetic note")

    def test_all_operations_deny_user_role_before_provider_access(self):
        for method, path, body in (
            ("GET", "/talent/records/demo", None),
            ("POST", "/talent/records", {}),
            ("PATCH", "/talent/records/demo", {"stage": "review", "status": "in_progress"}),
            ("GET", "/talent/records/demo/notes", None),
            ("POST", "/talent/records/demo/notes", {"content": "Synthetic note"}),
            ("DELETE", "/talent/records/demo/notes/note-demo", None),
        ):
            with self.subTest(method=method, path=path):
                self.set_role("user")
                response = self.client.request(method, path, headers=self.headers, json=body)
                self.assertEqual(response.status_code, 403)
        self.provider.assert_not_called()

    def test_upstream_errors_are_safe_and_do_not_expire_brasaland_session(self):
        for upstream_status in (401, 403, 500):
            with self.subTest(status=upstream_status), patch.object(tracker, "urlopen", side_effect=HTTPError("http://provider", upstream_status, "private secret", {}, None)):
                with self.assertRaises(main.HTTPException) as failure:
                    tracker.tracker_request("GET", "records")
                self.assertEqual(failure.exception.status_code, 502)
                self.assertNotIn("private", failure.exception.detail)


if __name__ == "__main__":
    unittest.main()