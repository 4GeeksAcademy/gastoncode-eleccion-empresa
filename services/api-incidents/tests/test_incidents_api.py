import importlib
import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from jose import jwt


SERVICE = Path(__file__).resolve().parents[1]
auth_spec = importlib.util.spec_from_file_location(
    "incidents_api_test_auth", SERVICE / "auth.py"
)
auth = importlib.util.module_from_spec(auth_spec)
with patch.dict(os.environ, {
    "JWT_SECRET": "incidents-api-test-secret",
    "AUTH_SERVICE_URL": "http://identity.test",
}), patch("dotenv.load_dotenv"):
    auth_spec.loader.exec_module(auth)


class IncidentsApiTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.incidents_path = Path(self.directory.name) / "incidents.json"
        self.analyses_path = Path(self.directory.name) / "analyses.json"
        models = importlib.import_module("services.api-incidents.models")
        main_spec = importlib.util.spec_from_file_location(
            "incidents_api_test_main", SERVICE / "main.py"
        )
        self.main = importlib.util.module_from_spec(main_spec)
        with patch.dict(os.environ, {
            "ANALYSES_DB_PATH": str(self.analyses_path),
            "INCIDENTS_DB_PATH": str(self.incidents_path),
        }), patch.dict(sys.modules, {"auth": auth, "models": models}):
            main_spec.loader.exec_module(self.main)
        self.addCleanup(self.main.db.close)
        self.client = TestClient(self.main.app)
        self.addCleanup(self.client.close)
        self.payload = {
            "title": "Fallo de horno",
            "description": "El horno no enciende.",
            "category": "equipment_failure",
            "origin": "branch",
            "branch": "miami_doral",
        }

    def token_headers(self, role="user"):
        token = jwt.encode(
            {"sub": "fixture-id", "role": role},
            auth.JWT_SECRET,
            algorithm="HS256",
        )
        return {"Authorization": f"Bearer {token}"}

    def as_role(self, role="user"):
        return patch.object(
            auth,
            "urlopen",
            side_effect=lambda *args, **kwargs: io.StringIO(
                json.dumps({"id": "fixture-id", "role": role})
            ),
        )

    def create_incident(self, **changes):
        with self.as_role("user"):
            response = self.client.post(
                "/api/incidents",
                headers=self.token_headers("user"),
                json={**self.payload, **changes},
            )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_every_authenticated_role_can_use_incident_operations(self):
        for role in ("user", "manager", "admin"):
            with self.subTest(role=role), self.as_role(role):
                headers = self.token_headers(role)
                created = self.client.post(
                    "/api/incidents", headers=headers, json=self.payload
                )
                self.assertEqual(created.status_code, 201, created.text)
                incident_id = created.json()["id"]
                self.assertEqual(
                    self.client.get("/api/incidents", headers=headers).status_code,
                    200,
                )
                self.assertEqual(
                    self.client.get(
                        f"/api/incidents/{incident_id}", headers=headers
                    ).status_code,
                    200,
                )
                self.assertEqual(
                    self.client.patch(
                        f"/api/incidents/{incident_id}/status",
                        headers=headers,
                        json={"status": "in_progress"},
                    ).status_code,
                    200,
                )
                self.assertEqual(
                    self.client.get(
                        "/api/incidents/summary", headers=headers
                    ).status_code,
                    200,
                )

    def test_protected_incident_routes_require_authentication(self):
        routes = (
            ("get", "/api/incidents", None),
            ("post", "/api/incidents", self.payload),
            ("get", "/api/incidents/summary", None),
        )
        for method, path, body in routes:
            with self.subTest(method=method, path=path):
                request = getattr(self.client, method)
                response = request(path, json=body) if body else request(path)
                self.assertEqual(response.status_code, 401)
        self.assertFalse(self.incidents_path.exists())

    def test_create_validation_errors_do_not_persist_records(self):
        invalid_payloads = (
            ({**self.payload, "title": "   "}, "body.title"),
            ({**self.payload, "description": " \t "}, "body.description"),
            ({**self.payload, "origin": "branch", "branch": "central"}, "body.branch"),
            ({**self.payload, "unexpected": "field"}, "body.unexpected"),
        )
        for payload, expected_field in invalid_payloads:
            with self.subTest(payload=payload), self.as_role("user"):
                response = self.client.post(
                    "/api/incidents",
                    headers=self.token_headers(),
                    json=payload,
                )
            self.assertEqual(response.status_code, 400, response.text)
            fields = [error["field"] for error in response.json()["detail"]]
            self.assertIn(expected_field, fields)
        with self.as_role("user"):
            listed = self.client.get("/api/incidents", headers=self.token_headers())
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json(), [])

    def test_filters_summary_and_created_records_are_persisted(self):
        self.create_incident()
        second = self.create_incident(
            title="Problema en entrega",
            description="Pedido recibido incompleto.",
            category="delivery_issue",
            origin="customer",
            branch="central",
        )
        with self.as_role("user"):
            filtered = self.client.get(
                "/api/incidents",
                params={"origin": "customer", "category": "delivery_issue"},
                headers=self.token_headers(),
            )
            summary = self.client.get(
                "/api/incidents/summary", headers=self.token_headers()
            )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual([row["id"] for row in filtered.json()], [second["id"]])
        self.assertEqual(summary.status_code, 200)
        counts = summary.json()
        self.assertEqual(counts["total"], 2)
        self.assertEqual(counts["by_status"]["open"], 2)
        self.assertEqual(counts["by_category"]["equipment_failure"], 1)
        self.assertEqual(counts["by_category"]["delivery_issue"], 1)
        self.assertEqual(counts["by_origin"]["branch"], 1)
        self.assertEqual(counts["by_origin"]["customer"], 1)

    def test_invalid_filter_is_a_client_error(self):
        with self.as_role("user"):
            response = self.client.get(
                "/api/incidents", params={"status": "unknown"},
                headers=self.token_headers(),
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"][0]["field"], "query.status")

    def test_status_transitions_persist_and_invalid_transition_conflicts(self):
        incident = self.create_incident()
        incident_id = incident["id"]
        headers = self.token_headers()
        with self.as_role("user"):
            in_progress = self.client.patch(
                f"/api/incidents/{incident_id}/status",
                headers=headers,
                json={"status": "in_progress"},
            )
            resolved = self.client.patch(
                f"/api/incidents/{incident_id}/status",
                headers=headers,
                json={"status": "resolved"},
            )
            invalid = self.client.patch(
                f"/api/incidents/{incident_id}/status",
                headers=headers,
                json={"status": "open"},
            )
            persisted = self.client.get(
                f"/api/incidents/{incident_id}", headers=headers
            )
        self.assertEqual(in_progress.status_code, 200, in_progress.text)
        self.assertEqual(in_progress.json()["status"], "in_progress")
        self.assertEqual(resolved.status_code, 200, resolved.text)
        self.assertEqual(resolved.json()["status"], "resolved")
        self.assertEqual(invalid.status_code, 409)
        self.assertEqual(persisted.status_code, 200)
        self.assertEqual(persisted.json()["status"], "resolved")

    def test_missing_incident_and_invalid_ids_have_distinct_responses(self):
        headers = self.token_headers()
        with self.as_role("user"):
            missing = self.client.get(
                "/api/incidents/00000000-0000-4000-8000-000000000000",
                headers=headers,
            )
            invalid = self.client.get("/api/incidents/not-a-uuid", headers=headers)
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(invalid.status_code, 400)

    def test_unhandled_error_log_uses_route_template_not_request_url(self):
        client = TestClient(self.main.app, raise_server_exceptions=False)
        self.addCleanup(client.close)
        self.main.app.dependency_overrides[auth.get_current_user] = lambda: {
            "id": "fixture-id", "role": "user",
        }
        self.addCleanup(self.main.app.dependency_overrides.clear)
        with patch.object(
            self.main,
            "_get_analysis",
            side_effect=RuntimeError("synthetic internal failure"),
        ), self.assertLogs(self.main.logger, level="ERROR") as captured:
            response = client.get(
                "/api/incidents/results/bd107364-ff31-4443-9560-067ac4f39eaf?secret=do-not-log"
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Error interno del servidor"})
        log_output = "\n".join(captured.output)
        self.assertIn("GET /api/incidents/results/{analysis_id}", log_output)
        self.assertNotIn("secret=do-not-log", log_output)
        self.assertNotIn("bd107364-ff31-4443-9560-067ac4f39eaf", log_output)

    def test_unexpected_content_type_log_omits_client_filename(self):
        malicious_filename = "private\nforged log entry.csv"
        csv = (
            "incident_id,date,location_id,category,description,status,customer_id,satisfaction_score,reporter_id\n"
            "BRS-000001,2025-01-02,COL-01,EQUIPMENT,Horno sin funcionar,OPEN,,,MGR-01\n"
        )
        with self.as_role("user"), self.assertLogs(self.main.logger, level="WARNING") as captured:
            response = self.client.post(
                "/api/incidents/analyze",
                headers=self.token_headers(),
                files={"file": (malicious_filename, csv, "application/x-untrusted")},
            )

        self.assertEqual(response.status_code, 200, response.text)
        log_output = "\n".join(captured.output)
        self.assertIn("Content-Type inesperado al subir un CSV", log_output)
        self.assertNotIn("private", log_output)
        self.assertNotIn("forged log entry", log_output)


if __name__ == "__main__":
    unittest.main()
