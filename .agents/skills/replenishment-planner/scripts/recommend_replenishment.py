"""Calculate deterministic stock replenishment suggestions from a CSV."""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_CEILING
from pathlib import Path


REQUIRED_COLUMNS = (
    "location_id",
    "sku",
    "unit",
    "stock_on_hand",
    "avg_daily_usage",
    "lead_time_days",
    "safety_stock_days",
    "incoming_qty",
    "pack_size",
)
NUMERIC_COLUMNS = REQUIRED_COLUMNS[3:]
RECOMMENDATION_COLUMNS = (
    "location_id",
    "sku",
    "unit",
    "target_stock",
    "inventory_position",
    "unrounded_need",
    "recommended_order_qty",
    "decision",
)
ERROR_COLUMNS = ("row_number", *REQUIRED_COLUMNS, "errors")


class InputValidationError(ValueError):
    """Raised when the input file cannot be processed as a CSV dataset."""


@dataclass
class PreparedRow:
    row_number: int
    raw_values: dict[str, str]
    location_id: str
    sku: str
    unit: str
    values: dict[str, Decimal | None]
    errors: list[str]


def format_decimal(value: Decimal) -> str:
    text = format(value.normalize(), "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def parse_number(row: PreparedRow, column: str, *, positive: bool = False) -> None:
    raw_value = row.raw_values[column].strip()
    if not raw_value:
        row.errors.append(f"{column}: valor obligatorio.")
        return

    try:
        value = Decimal(raw_value)
    except InvalidOperation:
        row.errors.append(f"{column}: debe ser un número válido.")
        return

    if not value.is_finite():
        row.errors.append(f"{column}: debe ser un número finito.")
        return
    if value < 0 or (positive and value == 0):
        comparator = "mayor que cero" if positive else "mayor o igual a cero"
        row.errors.append(f"{column}: debe ser {comparator}.")
        return

    row.values[column] = value


def prepare_row(row_number: int, data: dict[str | None, object]) -> PreparedRow:
    raw_values = {
        column: str(data.get(column) or "")
        for column in REQUIRED_COLUMNS
    }
    errors: list[str] = []
    if data.get(None):
        errors.append("La fila contiene más celdas que la cabecera.")

    location_id = raw_values["location_id"].strip()
    sku = raw_values["sku"].strip()
    unit = raw_values["unit"].strip()
    for column, value in (
        ("location_id", location_id),
        ("sku", sku),
        ("unit", unit),
    ):
        if not value:
            errors.append(f"{column}: valor obligatorio.")

    prepared = PreparedRow(
        row_number=row_number,
        raw_values=raw_values,
        location_id=location_id,
        sku=sku,
        unit=unit,
        values={},
        errors=errors,
    )
    for column in NUMERIC_COLUMNS:
        parse_number(prepared, column, positive=(column == "pack_size"))
    return prepared


def load_rows(input_path: Path) -> list[PreparedRow]:
    with input_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        headers = reader.fieldnames
        if not headers:
            raise InputValidationError("El CSV no contiene una cabecera.")
        if len(headers) != len(set(headers)):
            raise InputValidationError("La cabecera contiene nombres de columna duplicados.")

        missing = [column for column in REQUIRED_COLUMNS if column not in headers]
        if missing:
            raise InputValidationError(
                "Faltan columnas obligatorias: " + ", ".join(missing)
            )

        rows = [
            prepare_row(row_number, data)
            for row_number, data in enumerate(reader, start=2)
        ]

    if not rows:
        raise InputValidationError("El CSV no contiene filas de datos.")

    keys: dict[tuple[str, str], list[PreparedRow]] = {}
    for row in rows:
        if row.location_id and row.sku:
            keys.setdefault((row.location_id, row.sku), []).append(row)

    for key, duplicates in keys.items():
        if len(duplicates) > 1:
            message = f"Clave local/SKU duplicada: {key[0]} / {key[1]}."
            for row in duplicates:
                row.errors.append(message)

    return rows


def make_recommendation(row: PreparedRow) -> dict[str, str]:
    values = row.values
    avg_usage = values["avg_daily_usage"]
    lead_time = values["lead_time_days"]
    safety_days = values["safety_stock_days"]
    stock_on_hand = values["stock_on_hand"]
    incoming_qty = values["incoming_qty"]
    pack_size = values["pack_size"]

    assert all(
        value is not None
        for value in (
            avg_usage,
            lead_time,
            safety_days,
            stock_on_hand,
            incoming_qty,
            pack_size,
        )
    )
    target_stock = avg_usage * (lead_time + safety_days)
    inventory_position = stock_on_hand + incoming_qty
    unrounded_need = max(Decimal(0), target_stock - inventory_position)
    if unrounded_need == 0:
        recommended_order_qty = Decimal(0)
    else:
        packages = (unrounded_need / pack_size).to_integral_value(
            rounding=ROUND_CEILING
        )
        recommended_order_qty = packages * pack_size

    return {
        "location_id": row.location_id,
        "sku": row.sku,
        "unit": row.unit,
        "target_stock": format_decimal(target_stock),
        "inventory_position": format_decimal(inventory_position),
        "unrounded_need": format_decimal(unrounded_need),
        "recommended_order_qty": format_decimal(recommended_order_qty),
        "decision": "ORDER" if recommended_order_qty > 0 else "NO_ORDER",
    }


def validate_output_paths(
    input_path: Path,
    output_path: Path,
    errors_path: Path,
    overwrite: bool,
) -> None:
    input_resolved = input_path.resolve()
    output_resolved = output_path.resolve()
    errors_resolved = errors_path.resolve()
    if input_resolved in (output_resolved, errors_resolved):
        raise InputValidationError("Las salidas no pueden sobrescribir el archivo de entrada.")
    if output_resolved == errors_resolved:
        raise InputValidationError("Los archivos de recomendaciones y errores deben ser distintos.")
    if not overwrite and (output_path.exists() or errors_path.exists()):
        raise InputValidationError(
            "Ya existe un archivo de salida. Elija otra ruta o autorice --overwrite."
        )


def write_csv(path: Path, columns: tuple[str, ...], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def run(
    input_path: Path,
    output_path: Path,
    errors_path: Path,
    overwrite: bool = False,
) -> tuple[int, int]:
    validate_output_paths(input_path, output_path, errors_path, overwrite)
    prepared_rows = load_rows(input_path)

    recommendations = [
        make_recommendation(row)
        for row in prepared_rows
        if not row.errors
    ]
    invalid_rows = []
    for row in prepared_rows:
        if row.errors:
            invalid_rows.append(
                {
                    "row_number": str(row.row_number),
                    **row.raw_values,
                    "errors": " ".join(row.errors),
                }
            )

    write_csv(output_path, RECOMMENDATION_COLUMNS, recommendations)
    write_csv(errors_path, ERROR_COLUMNS, invalid_rows)
    return len(recommendations), len(invalid_rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Calcula sugerencias de reposición a partir de un CSV validado."
    )
    parser.add_argument("--input", type=Path, required=True, help="CSV de inventario")
    parser.add_argument("--output", type=Path, required=True, help="CSV de recomendaciones")
    parser.add_argument("--errors", type=Path, required=True, help="CSV de filas inválidas")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Permite reemplazar archivos de salida existentes.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        valid_count, invalid_count = run(
            args.input,
            args.output,
            args.errors,
            overwrite=args.overwrite,
        )
    except (OSError, UnicodeError, csv.Error, InputValidationError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Filas válidas: {valid_count}; filas inválidas: {invalid_count}.")
    return 2 if invalid_count else 0


if __name__ == "__main__":
    raise SystemExit(main())