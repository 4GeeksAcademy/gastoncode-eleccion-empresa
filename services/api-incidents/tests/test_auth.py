import importlib
import importlib.util
import io
import json
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from fastapi import HTTPException
from fastapi.testclient import TestClient
from jose import jwt


SERVICE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("incidents_auth_test", SERVICE / "auth.py")
auth = importlib.util.module_from_spec(spec)
with patch.dict(os.environ, {
    "JWT_SECRET": "unit-test-only-secret",
    "AUTH_SERVICE_URL": "http://identity.test",
}), patch("dotenv.load_dotenv"):
    spec.loader.exec_module(auth)


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.token = jwt.encode(
            {"sub": "fixture-id", "role": "admin"}, auth.JWT_SECRET, algorithm="HS256"
        )

    def test_current_identity_overrides_old_claims_without_caching(self):
        responses = [
            io.StringIO(json.dumps({"id": "fixture-id", "role": role}))
            for role in ("manager", "user")
        ]
        with patch.object(auth, "urlopen", side_effect=responses) as upstream:
            self.assertEqual(auth.get_current_user(self.token)["role"], "manager")
            self.assertEqual(auth.get_current_user(self.token)["role"], "user")
        self.assertEqual(upstream.call_count, 2)
        request = upstream.call_args.args[0]
        self.assertEqual(request.full_url, "http://identity.test/auth/me")
        self.assertEqual(request.get_header("Authorization"), f"Bearer {self.token}")
        self.assertEqual(upstream.call_args.kwargs["timeout"], 3)

    def test_deleted_or_disabled_account_rejected(self):
        failure = HTTPError("http://identity.test", 401, "Inactive", {}, None)
        self.addCleanup(failure.close)
        with patch.object(auth, "urlopen", side_effect=failure):
            with self.assertRaises(HTTPException) as caught:
                auth.get_current_user(self.token)
        self.assertEqual(caught.exception.status_code, 401)

    def test_identity_outages_fail_closed(self):
        for failure in (
            URLError("Unavailable"), TimeoutError(), OSError(),
            HTTPError("http://identity.test", 500, "Unavailable", {}, None),
        ):
            with self.subTest(failure=type(failure).__name__):
                if isinstance(failure, HTTPError):
                    self.addCleanup(failure.close)
                with patch.object(auth, "urlopen", side_effect=failure):
                    with self.assertRaises(HTTPException) as caught:
                        auth.get_current_user(self.token)
                self.assertEqual(caught.exception.status_code, 503)

    def test_invalid_identity_rejected(self):
        for body in (
            {"id": "other", "role": "admin"}, {"id": "fixture-id"},
            {"id": "fixture-id", "role": []}, [],
        ):
            with self.subTest(body=body):
                with patch.object(auth, "urlopen", return_value=io.StringIO(json.dumps(body))):
                    with self.assertRaises(HTTPException) as caught:
                        auth.get_current_user(self.token)
                self.assertEqual(caught.exception.status_code, 401)

    def test_malformed_upstream_response_returns_503(self):
        with patch.object(auth, "urlopen", return_value=io.StringIO("not-json")):
            with self.assertRaises(HTTPException) as caught:
                auth.get_current_user(self.token)
        self.assertEqual(caught.exception.status_code, 503)

    def test_invalid_tokens_never_call_identity_service(self):
        tokens = [
            "invalid",
            jwt.encode({"sub": "fixture-id"}, "wrong-secret", algorithm="HS256"),
            jwt.encode({"sub": "fixture-id", "exp": 0}, auth.JWT_SECRET, algorithm="HS256"),
            jwt.encode({"role": "user"}, auth.JWT_SECRET, algorithm="HS256"),
        ]
        with patch.object(auth, "urlopen") as upstream:
            for token in tokens:
                with self.subTest(token=tokens.index(token)):
                    with self.assertRaises(HTTPException) as caught:
                        auth.get_current_user(token)
                    self.assertEqual(caught.exception.status_code, 401)
            upstream.assert_not_called()

    def test_role_checker_uses_current_role(self):
        with self.assertRaises(HTTPException) as caught:
            auth.require_roles(["admin"])({"id": "fixture-id", "role": "user"})
        self.assertEqual(caught.exception.status_code, 403)


class EndpointTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        models = importlib.import_module("services.api-incidents.models")
        main_spec = importlib.util.spec_from_file_location("incidents_main_test", SERVICE / "main.py")
        self.main = importlib.util.module_from_spec(main_spec)
        with patch.dict(os.environ, {
            "ANALYSES_DB_PATH": str(Path(directory.name) / "analyses.json"),
            "INCIDENTS_DB_PATH": str(Path(directory.name) / "incidents.json"),
        }), patch.dict(sys.modules, {"auth": auth, "models": models}):
            main_spec.loader.exec_module(self.main)
        self.addCleanup(self.main.db.close)
        self.client = TestClient(self.main.app)
        self.addCleanup(self.client.close)
        token = jwt.encode({"sub": "fixture-id", "role": "admin"}, auth.JWT_SECRET, algorithm="HS256")
        self.headers = {"Authorization": f"Bearer {token}"}
        self.payload = {
            "title": "Fallo de horno", "description": "El horno no enciende.",
            "category": "equipment_failure", "origin": "branch", "branch": "miami_doral",
        }

    def test_account_deactivation_blocks_next_read_and_write(self):
        with patch.object(auth, "urlopen", return_value=io.StringIO('{"id":"fixture-id","role":"user"}')):
            self.assertEqual(self.client.get("/api/incidents", headers=self.headers).status_code, 200)
        before = self.main.INCIDENTS_DB_PATH.read_bytes()
        failure = HTTPError("http://identity.test", 401, "Inactive", {}, None)
        self.addCleanup(failure.close)
        with patch.object(auth, "urlopen", side_effect=failure):
            self.assertEqual(self.client.get("/api/incidents", headers=self.headers).status_code, 401)
            self.assertEqual(self.client.post(
                "/api/incidents", headers=self.headers, json=self.payload,
            ).status_code, 401)
        self.assertEqual(self.main.INCIDENTS_DB_PATH.read_bytes(), before)

    def test_identity_outage_blocks_writes_with_503(self):
        with patch.object(auth, "urlopen", side_effect=URLError("Unavailable")):
            response = self.client.post("/api/incidents", headers=self.headers, json=self.payload)
        self.assertEqual(response.status_code, 503)
        self.assertFalse(self.main.INCIDENTS_DB_PATH.exists())

    def test_csv_upload_results_and_export_contract(self):
        csv = (
            "incident_id,date,location_id,category,description,status,customer_id,satisfaction_score,reporter_id\n"
            "BRS-000001,2025-01-02,COL-01,EQUIPMENT,Horno sin funcionar,OPEN,,,MGR-01\n"
        )
        def identity_response(*args, **kwargs):
            return io.StringIO('{"id":"fixture-id","role":"user"}')

        with patch.object(auth, "urlopen", side_effect=identity_response) as upstream:
            upload = self.client.post(
                "/api/incidents/analyze", headers=self.headers,
                files={"file": ("synthetic.csv", csv, "text/csv")},
            )
            self.assertEqual(upload.status_code, 200)
            self.assertEqual(set(upload.json()), {"analysis_id"})
            analysis_id = upload.json()["analysis_id"]
            result = self.client.get(f"/api/incidents/results/{analysis_id}", headers=self.headers)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json()["analysis_id"], analysis_id)
            self.assertEqual(result.json()["total_records"], 1)
            self.assertEqual(result.json()["valid_records"], 1)
            exported = self.client.get(
                "/api/incidents/results/export", params={"analysis_id": analysis_id}, headers=self.headers,
            )
            self.assertEqual(exported.status_code, 200)
            self.assertTrue(exported.headers["content-type"].startswith("text/csv"))
            self.assertIn("total_records", exported.text)
            self.assertEqual(upstream.call_count, 3)
        self.assertFalse(self.main.INCIDENTS_DB_PATH.exists())

    def test_concurrent_uploads_health_and_cold_reads_preserve_every_analysis(self):
        csv = (
            "incident_id,date,location_id,category,description,status,customer_id,satisfaction_score,reporter_id\n"
            "BRS-000001,2025-01-02,COL-01,EQUIPMENT,Horno sin funcionar,OPEN,,,MGR-01\n"
        )
        self.main.app.dependency_overrides[auth.get_current_user] = lambda: {
            "id": "fixture-id", "role": "user",
        }

        def upload(index):
            with TestClient(self.main.app) as client:
                response = client.post(
                    "/api/incidents/analyze",
                    files={"file": (f"synthetic-{index}.csv", csv, "text/csv")},
                )
                self.assertEqual(response.status_code, 200)
                health = client.get("/health")
                self.assertEqual(health.status_code, 200)
                self.assertGreaterEqual(health.json()["persisted_analyses"], 1)
                return response.json()["analysis_id"], f"synthetic-{index}.csv"

        with ThreadPoolExecutor(max_workers=8) as executor:
            uploaded = list(executor.map(upload, range(32)))
        self.assertEqual(len({identifier for identifier, _ in uploaded}), 32)
        persisted = json.loads(self.main.DB_PATH.read_text())["analyses"]
        self.assertEqual(len(persisted), 32)
        self.assertEqual({row["analysis_id"] for row in persisted.values()},
                         {identifier for identifier, _ in uploaded})
        with self.main._cache_lock:
            self.main.analyses_cache.clear()

        def read_analysis(item):
            identifier, filename = item
            with TestClient(self.main.app) as client:
                response = client.get(f"/api/incidents/results/{identifier}")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["source_file"], filename)
                self.assertEqual(response.json()["valid_records"], 1)
                exported = client.get("/api/incidents/results/export", params={"analysis_id": identifier})
                self.assertEqual(exported.status_code, 200)
                self.assertIn("valid_records,1,", exported.text)

        with ThreadPoolExecutor(max_workers=8) as executor:
            list(executor.map(read_analysis, uploaded))
        self.assertEqual(self.client.get("/health").json()["persisted_analyses"], 32)


if __name__ == "__main__":
    unittest.main()
