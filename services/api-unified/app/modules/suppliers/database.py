"""Suppliers database — TinyDB persistence."""

from pathlib import Path
import os

from tinydb import TinyDB

SERVICE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = SERVICE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = Path(os.getenv("SUPPLIERS_DB_PATH", str(DATA_DIR / "suppliers.json")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(DB_PATH)
suppliers_table = db.table("suppliers")
