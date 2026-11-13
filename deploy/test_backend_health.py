import importlib.util
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import URLError


spec = importlib.util.spec_from_file_location(
    "backend_health", Path(__file__).with_name("backend-health.py")
)
health = importlib.util.module_from_spec(spec)
spec.loader.exec_module(health)


class BackendHealthTests(unittest.TestCase):
    def test_checks_every_api(self):
        response = MagicMock()
        response.__enter__.return_value.status = 200
        with patch.object(health, "urlopen", return_value=response) as urlopen:
            self.assertEqual(health.main(), 0)
        self.assertEqual(
            [call.args[0] for call in urlopen.call_args_list],
            [
                "http://127.0.0.1:8000/",
                "http://127.0.0.1:8001/",
                "http://127.0.0.1:8002/",
            ],
        )

    def test_fails_when_an_api_is_unavailable(self):
        with patch.object(health, "urlopen", side_effect=URLError("unavailable")):
            self.assertEqual(health.main(), 1)


if __name__ == "__main__":
    unittest.main()
