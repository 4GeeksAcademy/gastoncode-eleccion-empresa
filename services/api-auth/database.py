from pathlib import Path
import os
from tinydb import TinyDB


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(exist_ok=True)

DB_PATH = Path(os.getenv("AUTH_DB_PATH", str(DATA_DIR / "db.json")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(DB_PATH)

users_table = db.table("users")
profiles_table = db.table("profiles")
