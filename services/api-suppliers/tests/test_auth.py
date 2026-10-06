import importlib.util
import io
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from fastapi import HTTPException
from jose import jwt

os.environ.setdefault("JWT_SECRET", "unit-test-only-secret")
spec = importlib.util.spec_from_file_location("suppliers_auth_test", Path(__file__).parents[1] / "auth.py")
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.token = jwt.encode({"sub": "fixture-id", "role": "admin"}, auth.JWT_SECRET, algorithm="HS256")

    def test_current_role_overrides_old_claim(self):
        response = io.StringIO(json.dumps({"id": "fixture-id", "role": "user", "email": "fixture@example.test"}))
        with patch.object(auth, "urlopen", return_value=response):
            current = auth.get_current_user(self.token)
        self.assertEqual(current["role"], "user")

    def test_inactive_account_rejected(self):
        with patch.object(auth, "urlopen", side_effect=HTTPError("http://fixture", 401, "Inactive", {}, None)):
            with self.assertRaises(HTTPException) as caught:
                auth.get_current_user(self.token)
        self.assertEqual(caught.exception.status_code, 401)

    def test_auth_unavailable_fails_closed(self):
        with patch.object(auth, "urlopen", side_effect=URLError("Unavailable")):
            with self.assertRaises(HTTPException) as caught:
                auth.get_current_user(self.token)
        self.assertEqual(caught.exception.status_code, 503)

    def test_wrong_identity_rejected(self):
        with patch.object(auth, "urlopen", return_value=io.StringIO('{"id":"other","role":"admin"}')):
            with self.assertRaises(HTTPException) as caught:
                auth.get_current_user(self.token)
        self.assertEqual(caught.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()