import atexit
import os
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from tinydb import TinyDB


SERVICE_DIR = Path(__file__).parents[1]
sys.path.insert(0, str(SERVICE_DIR))
os.environ.setdefault("JWT_SECRET", "unit-test-only-secret")
_import_directory = tempfile.TemporaryDirectory()
atexit.register(_import_directory.cleanup)
os.environ["SUPPLIERS_DB_PATH"] = str(Path(_import_directory.name) / "import.json")

import main  # noqa: E402
from database import db as import_db  # noqa: E402
from auth import get_current_user  # noqa: E402
from models import SupplierCreateInput  # noqa: E402
from routers import suppliers  # noqa: E402

atexit.register(import_db.close)


class SupplierConcurrencyTests(unittest.TestCase):
    def test_synchronized_route_preserves_fastapi_dependency_signature(self):
        main.app.dependency_overrides[get_current_user] = lambda: {"role": "user"}
        try:
            with tempfile.TemporaryDirectory() as directory:
                db = TinyDB(Path(directory) / "suppliers.json")
                with patch.object(suppliers, "suppliers_table", db.table("suppliers")):
                    response = TestClient(main.app).get("/suppliers")
                db.close()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), [])
        finally:
            main.app.dependency_overrides.clear()

    def test_concurrent_creations_preserve_every_supplier(self):
        with tempfile.TemporaryDirectory() as directory:
            db = TinyDB(Path(directory) / "suppliers.json")
            with patch.object(suppliers, "suppliers_table", db.table("suppliers")):
                def create(index):
                    return suppliers.create_supplier(
                        SupplierCreateInput(
                            name=f"Supplier {index}",
                            country="Colombia",
                            categories=["carne"],
                            rate_per_unit=1,
                            currency="COP",
                            status="active",
                        ),
                        current_user={"role": "admin"},
                    )

                with ThreadPoolExecutor(max_workers=8) as executor:
                    created = list(executor.map(create, range(50)))

                self.assertEqual(len({supplier.id for supplier in created}), 50)
                self.assertEqual(len(suppliers.get_suppliers(current_user={})), 50)
            db.close()


if __name__ == "__main__":
    unittest.main()
