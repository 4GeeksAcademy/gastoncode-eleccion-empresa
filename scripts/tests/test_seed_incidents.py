import csv
import importlib
import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from tinydb import TinyDB


seed = importlib.import_module("scripts.seed_incidents")


class SeedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.csv_path = Path(self.temp.name) / "synthetic.csv"
        self.db_path = Path(self.temp.name) / "incidents.json"

    def row(self, **changes):
        return {
            "incident_id": "BRS-000001",
            "date": "2025-01-02",
            "location_id": "COL-01",
            "category": "EQUIPMENT",
            "description": "  El horno no enciende.  ",
            "status": "OPEN",
            "customer_id": "",
            "satisfaction_score": "",
            "reporter_id": "MGR-01",
            **changes,
        }

    def write_csv(self, rows):
        with self.csv_path.open("w", encoding="utf-8-sig", newline="") as target:
            writer = csv.DictWriter(target, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)

    def run_seed(self):
        with redirect_stdout(io.StringIO()) as output:
            counts = seed.seed_incidents(self.csv_path, self.db_path)
        return counts, output.getvalue()

    def test_mapping_persistence_and_rerun(self):
        self.write_csv([self.row(), self.row()])
        counts, output = self.run_seed()
        self.assertEqual(counts, {"read": 2, "inserted": 1, "skipped": 1, "rejected": 0})
        self.assertIn("Resumen final", output)
        with TinyDB(self.db_path) as db:
            document = db.table("incidents").all()[0]
            incident = seed.Incident.model_validate(document)
            self.assertEqual(incident.title, "El horno no enciende.")
            self.assertEqual(incident.description, "  El horno no enciende.  ")
            self.assertEqual(incident.category, "equipment_failure")
            self.assertEqual(incident.branch, "medellin_centro")
            self.assertEqual(incident.origin, "customer")
            self.assertEqual(incident.created_at.isoformat(), "2025-01-02T00:00:00+00:00")
            self.assertEqual(incident.updated_at, incident.created_at)
            self.assertNotIn("incident_id", document)
        self.assertEqual(self.run_seed()[0]["skipped"], 2)

    def test_all_category_status_and_branch_mappings(self):
        rows = []
        for index, (category, status, branch) in enumerate(
            (c, s, b)
            for c in seed.CATEGORY_MAP
            for s in seed.STATUS_MAP
            for b in seed.BRANCH_MAP
        ):
            rows.append(self.row(
                incident_id=f"BRS-{index:06d}", category=category,
                status=status, location_id=branch, satisfaction_score="4",
            ))
        self.write_csv(rows)
        self.assertEqual(self.run_seed()[0]["inserted"], len(rows))
        with TinyDB(self.db_path) as db:
            for row, document in zip(rows, db.table("incidents")):
                self.assertEqual(document["category"], seed.CATEGORY_MAP[row["category"]])
                self.assertEqual(document["status"], seed.STATUS_MAP[row["status"]])
                self.assertEqual(document["branch"], seed.BRANCH_MAP[row["location_id"]])

    def test_fallback_id_and_branch(self):
        row = self.row(location_id="unknown")
        del row["incident_id"]
        self.write_csv([row, row])
        self.assertEqual(self.run_seed()[0]["inserted"], 1)
        self.assertEqual(self.run_seed()[0]["skipped"], 2)
        with TinyDB(self.db_path) as db:
            self.assertEqual(db.table("incidents").all()[0]["branch"], "central")

    def test_invalid_rows_are_rejected_before_duplicate_check(self):
        self.write_csv([
            self.row(),
            self.row(status="CLOSED"),
            self.row(category="unknown"),
            self.row(description=" "),
            self.row(date="not-a-date"),
            self.row(incident_id="wrong"),
            self.row(reporter_id="invalid"),
        ])
        counts, output = self.run_seed()
        self.assertEqual(counts, {"read": 7, "inserted": 1, "skipped": 0, "rejected": 6})
        self.assertIn("closed_missing_score", output)

    def test_source_id_is_primary_deduplication_key(self):
        self.write_csv([
            self.row(),
            self.row(description="Descripcion corregida"),
            self.row(incident_id="BRS-000002"),
        ])
        counts, _ = self.run_seed()
        self.assertEqual(counts["inserted"], 2)
        self.assertEqual(counts["skipped"], 1)

    def test_title_truncation_preserves_description(self):
        self.write_csv([self.row(description="a" * 150)])
        self.run_seed()
        with TinyDB(self.db_path) as db:
            document = db.table("incidents").all()[0]
            self.assertEqual(len(document["title"]), 120)
            self.assertEqual(len(document["description"]), 150)

    def test_missing_columns_and_unreadable_input_fail_explicitly(self):
        self.csv_path.write_text("title\nsynthetic\n")
        with self.assertRaises(ValueError):
            self.run_seed()
        self.assertFalse(self.db_path.exists())
        with self.assertRaises(FileNotFoundError):
            seed.seed_incidents(Path(self.temp.name) / "missing.csv", self.db_path)

    def test_bad_column_count_is_reported(self):
        self.write_csv([self.row()])
        with self.csv_path.open("a") as target:
            target.write("too,few\n")
        counts, output = self.run_seed()
        self.assertEqual(counts["rejected"], 1)
        self.assertIn("numero de columnas", output)


if __name__ == "__main__":
    unittest.main()
