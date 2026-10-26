import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import BaseModel


SERVICE_DIR = Path(__file__).parents[1]
sys.path.insert(0, str(SERVICE_DIR))
os.environ.setdefault("JWT_SECRET", "unit-test-only-secret")
os.environ.setdefault("SUPPLIERS_DB_PATH", "/tmp/api-suppliers-error-tests.json")

import main  # noqa: E402
import seed  # noqa: E402


class InvalidInput(BaseModel):
    quantity: int


class ErrorHandlingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        def raise_unexpected_error():
            raise RuntimeError("sensitive database path /private/data.db")

        def accept_payload(payload: InvalidInput):
            return payload

        main.app.add_api_route("/__test/unhandled", raise_unexpected_error, methods=["GET"])
        main.app.add_api_route("/__test/validation", accept_payload, methods=["POST"])

    def test_unhandled_exception_returns_generic_500_and_safe_log(self):
        client = TestClient(main.app, raise_server_exceptions=False)
        with self.assertLogs(main.logger, level="ERROR") as captured:
            response = client.get("/__test/unhandled")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Internal server error"})
        log_output = "\n".join(captured.output)
        self.assertIn("RuntimeError", log_output)
        self.assertNotIn("/private/data.db", log_output)
        self.assertNotIn("sensitive database path", log_output)

    def test_validation_response_does_not_echo_rejected_input(self):
        client = TestClient(main.app)
        response = client.post(
            "/__test/validation",
            json={"quantity": "private-customer-value"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertNotIn("private-customer-value", response.text)
        self.assertEqual(
            response.json()["detail"][0]["loc"],
            ["body", "quantity"],
        )

    def test_seed_returns_failure_code_when_seed_data_is_invalid(self):
        with patch.object(seed, "seed_data", [{"name": "invalid"}]):
            self.assertEqual(seed.main(), 1)

    def test_seed_returns_failure_code_when_persistence_fails(self):
        class FailingTable:
            def __len__(self):
                return 0

            def insert(self, supplier):
                raise OSError("sensitive database path /private/suppliers.json")

        with patch.object(seed, "suppliers_table", FailingTable()), self.assertLogs(
            seed.logger,
            level="ERROR",
        ) as captured:
            result = seed.main()

        self.assertEqual(result, 1)
        self.assertNotIn("/private/suppliers.json", "\n".join(captured.output))


if __name__ == "__main__":
    unittest.main()
