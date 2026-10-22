"""Carga idempotente de incidencias legacy en TinyDB."""

import argparse
import csv
import importlib
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from pydantic import ValidationError
from tinydb import TinyDB


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from packages.incidents_analysis.analyzer import clean, validate_row

Incident = importlib.import_module("services.api-incidents.models").Incident

DEFAULT_CSV = ROOT / "scripts" / "incidents-brasaland.csv"
DEFAULT_DB = ROOT / "services" / "api-incidents" / "incidents.json"

STATUS_MAP = {"OPEN": "open", "CLOSED": "resolved", "DISCARDED": "discarded"}
CATEGORY_MAP = {
    "CUSTOMER_COMPLAINT": "customer_complaint",
    "EQUIPMENT": "equipment_failure",
    "SUPPLY": "supply_issue",
    "FOOD_QUALITY": "customer_complaint",
    "STAFF": "staff_issue",
}
BRANCH_MAP = {
    "COL-01": "medellin_centro",
    "COL-02": "medellin_laureles",
    "COL-03": "medellin_envigado",
    "COL-04": "medellin_bello",
    "COL-05": "medellin_itagui",
    "COL-06": "bogota_chapinero",
    "COL-07": "bogota_usaquen",
    "COL-08": "cali_granada",
    "COL-09": "barranquilla_norte",
    "COL-10": "central",
    "FLA-01": "miami_doral",
    "FLA-02": "miami_hialeah",
    "FLA-03": "miami_kendall",
    "FLA-04": "orlando_international",
}


def transform_row(row: dict[str, str]) -> dict[str, object]:
    description = row.get("description") or ""
    created_at = datetime.strptime(clean(row.get("date")), "%Y-%m-%d").replace(
        tzinfo=timezone.utc
    )
    return {
        "title": description[:120].strip(),
        "description": description,
        "category": CATEGORY_MAP[clean(row.get("category"))],
        "status": STATUS_MAP[clean(row.get("status"))],
        "origin": "customer",
        "branch": BRANCH_MAP.get(clean(row.get("location_id")), "central"),
        "created_at": created_at,
        "updated_at": created_at,
    }


def seed_incidents(csv_path: Path, db_path: Path) -> dict[str, int]:
    counts = {"read": 0, "inserted": 0, "skipped": 0, "rejected": 0}
    statuses: Counter[str] = Counter()
    categories: Counter[str] = Counter()

    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source, strict=True)
        required = {"description", "date", "category", "status", "reporter_id"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError("El CSV no contiene las columnas obligatorias del analizador.")
        if len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError("El CSV contiene columnas duplicadas.")

        db_path.parent.mkdir(parents=True, exist_ok=True)
        with TinyDB(db_path) as db:
            incidents = db.table("incidents")
            sources = db.table("incident_seed_sources")
            imported_ids = {doc["source_id"] for doc in sources}
            fingerprints = {
                (doc["title"], doc["created_at"]): doc["id"] for doc in incidents
            }

            for row in reader:
                counts["read"] += 1
                line = reader.line_num
                if None in row or any(value is None for value in row.values()):
                    counts["rejected"] += 1
                    print(f"Fila {line}: descartada (numero de columnas incorrecto).")
                    continue

                try:
                    transformed = transform_row(row)
                except (ValueError, KeyError):
                    counts["rejected"] += 1
                    print(f"Fila {line}: descartada (fecha, categoria o estado no mapeable).")
                    continue

                # El contexto permite ID ausente y sede desconocida con fallback.
                errors = [
                    error for error in validate_row(row)
                    if error not in {"missing_incident_id", "invalid_location_id"}
                ]
                if errors:
                    counts["rejected"] += 1
                    print(f"Fila {line}: descartada (validacion CSV: {', '.join(errors)}).")
                    continue
                try:
                    incident = Incident.model_validate(transformed)
                except ValidationError:
                    counts["rejected"] += 1
                    print(f"Fila {line}: descartada (restricciones del modelo Incident).")
                    continue

                document = incident.model_dump(mode="json")
                source_id = clean(row.get("incident_id"))
                fingerprint = (document["title"], document["created_at"])
                if source_id:
                    duplicate = source_id in imported_ids
                else:
                    duplicate = fingerprint in fingerprints

                if duplicate:
                    counts["skipped"] += 1
                    continue

                incidents.insert(document)
                if source_id:
                    sources.insert({"source_id": source_id, "incident_id": document["id"]})
                    imported_ids.add(source_id)
                fingerprints[fingerprint] = document["id"]
                counts["inserted"] += 1
                statuses[document["status"]] += 1
                categories[document["category"]] += 1

    print(
        "Resumen final: "
        f"leidas={counts['read']}, insertadas={counts['inserted']}, "
        f"duplicadas={counts['skipped']}, descartadas={counts['rejected']}"
    )
    print(f"Insertadas por estado: {dict(sorted(statuses.items()))}")
    print(f"Insertadas por categoria: {dict(sorted(categories.items()))}")
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    try:
        seed_incidents(args.csv, args.db)
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        print(f"Error al ejecutar el seed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())