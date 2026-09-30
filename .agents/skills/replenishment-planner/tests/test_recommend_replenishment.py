import csv
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_DIR = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_DIR / "scripts" / "recommend_replenishment.py"
INPUT_HEADER = (
    "location_id,sku,unit,stock_on_hand,avg_daily_usage,lead_time_days,"
    "safety_stock_days,incoming_qty,pack_size\n"
)
SAMPLE_INPUT = (
    INPUT_HEADER
    + "MDE-01,RES-01,kg,18,5,3,2,4,6\n"
    + "MDE-01,VEG-01,kg,50,2,2,1,10,5\n"
    + "MIA-01,BOX-01,unidad,2,0,1,3,0,1\n"
)
EXPECTED_RECOMMENDATIONS = (
    "location_id,sku,unit,target_stock,inventory_position,unrounded_need,"
    "recommended_order_qty,decision\n"
    "MDE-01,RES-01,kg,25,22,3,6,ORDER\n"
    "MDE-01,VEG-01,kg,6,60,0,0,NO_ORDER\n"
    "MIA-01,BOX-01,unidad,0,2,0,0,NO_ORDER\n"
)
EXPECTED_ERROR_HEADER = (
    "row_number,location_id,sku,unit,stock_on_hand,avg_daily_usage,"
    "lead_time_days,safety_stock_days,incoming_qty,pack_size,errors\n"
)


class ReplenishmentCliTests(unittest.TestCase):
    def run_cli(self, input_path: Path, output_path: Path, errors_path: Path):
        return subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--input",
                str(input_path),
                "--output",
                str(output_path),
                "--errors",
                str(errors_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_example_matches_exact_expected_output(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "inventory.csv"
            output_path = temp_path / "recommendations.csv"
            errors_path = temp_path / "errors.csv"
            input_path.write_text(SAMPLE_INPUT, encoding="utf-8")

            result = self.run_cli(input_path, output_path, errors_path)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                output_path.read_text(encoding="utf-8"),
                EXPECTED_RECOMMENDATIONS,
            )
            self.assertEqual(
                errors_path.read_text(encoding="utf-8"),
                EXPECTED_ERROR_HEADER,
            )

    def test_duplicate_keys_and_invalid_values_are_reported(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "inventory.csv"
            input_path.write_text(
                INPUT_HEADER
                + "MDE-01,RES-01,kg,18,5,3,2,4,6\n"
                + "MDE-01,RES-01,kg,20,4,3,2,0,6\n"
                + "MIA-01,BOX-01,unit,-1,0,1,1,0,1\n",
                encoding="utf-8",
            )
            output_path = temp_path / "recommendations.csv"
            errors_path = temp_path / "errors.csv"

            result = self.run_cli(input_path, output_path, errors_path)

            self.assertEqual(result.returncode, 2)
            with errors_path.open(encoding="utf-8", newline="") as source:
                invalid_rows = list(csv.DictReader(source))
            self.assertEqual(len(invalid_rows), 3)
            self.assertIn("duplicada", invalid_rows[0]["errors"])
            self.assertIn("duplicada", invalid_rows[1]["errors"])
            self.assertIn("stock_on_hand", invalid_rows[2]["errors"])
            with output_path.open(encoding="utf-8", newline="") as source:
                self.assertEqual(list(csv.DictReader(source)), [])

    def test_fractional_quantities_round_up_to_whole_packs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "inventory.csv"
            input_path.write_text(
                INPUT_HEADER + "MDE-01,SAUCE-01,kg,0,1.25,2,0.5,0,2\n",
                encoding="utf-8",
            )
            output_path = temp_path / "recommendations.csv"
            errors_path = temp_path / "errors.csv"

            result = self.run_cli(input_path, output_path, errors_path)

            self.assertEqual(result.returncode, 0, result.stderr)
            with output_path.open(encoding="utf-8", newline="") as source:
                recommendation = next(csv.DictReader(source))
            self.assertEqual(recommendation["target_stock"], "3.125")
            self.assertEqual(recommendation["unrounded_need"], "3.125")
            self.assertEqual(recommendation["recommended_order_qty"], "4")

    def test_nonfinite_empty_and_extra_values_are_rejected_with_reasons(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "inventory.csv"
            input_path.write_text(
                INPUT_HEADER
                + "MDE-01,NAN-01,kg,NaN,1,1,1,0,1\n"
                + ",EMPTY-SKU,kg,0,1,1,1,0,1\n"
                + "MDE-01,EXTRA,kg,0,1,1,1,0,1,EXTRA\n"
                + "MDE-01,NONNUM,kg,bad,1,1,1,0,1\n",
                encoding="utf-8",
            )
            output_path = temp_path / "recommendations.csv"
            errors_path = temp_path / "errors.csv"

            result = self.run_cli(input_path, output_path, errors_path)

            self.assertEqual(result.returncode, 2)
            with errors_path.open(encoding="utf-8", newline="") as source:
                invalid_rows = list(csv.DictReader(source))
            self.assertEqual(len(invalid_rows), 4)
            self.assertIn("finito", invalid_rows[0]["errors"])
            self.assertIn("location_id: valor obligatorio", invalid_rows[1]["errors"])
            self.assertIn("más celdas", invalid_rows[2]["errors"])
            self.assertIn("número válido", invalid_rows[3]["errors"])

    def test_missing_required_column_fails_without_creating_outputs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "inventory.csv"
            input_path.write_text("location_id,sku\nMDE-01,RES-01\n", encoding="utf-8")
            output_path = temp_path / "recommendations.csv"
            errors_path = temp_path / "errors.csv"

            result = self.run_cli(input_path, output_path, errors_path)

            self.assertEqual(result.returncode, 1)
            self.assertIn("Faltan columnas obligatorias", result.stderr)
            self.assertFalse(output_path.exists())
            self.assertFalse(errors_path.exists())

    def test_refuses_to_overwrite_existing_output_by_default(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "inventory.csv"
            input_path.write_text(
                INPUT_HEADER + "MDE-01,RES-01,kg,18,5,3,2,4,6\n",
                encoding="utf-8",
            )
            output_path = temp_path / "recommendations.csv"
            errors_path = temp_path / "errors.csv"
            output_path.write_text("keep this file\n", encoding="utf-8")

            result = self.run_cli(input_path, output_path, errors_path)

            self.assertEqual(result.returncode, 1)
            self.assertEqual(output_path.read_text(encoding="utf-8"), "keep this file\n")
            self.assertFalse(errors_path.exists())

    def test_refuses_to_use_input_as_an_output_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "inventory.csv"
            input_path.write_text(
                INPUT_HEADER + "MDE-01,RES-01,kg,18,5,3,2,4,6\n",
                encoding="utf-8",
            )
            original = input_path.read_bytes()
            errors_path = temp_path / "errors.csv"

            result = self.run_cli(input_path, input_path, errors_path)

            self.assertEqual(result.returncode, 1)
            self.assertEqual(input_path.read_bytes(), original)
            self.assertFalse(errors_path.exists())


if __name__ == "__main__":
    unittest.main()