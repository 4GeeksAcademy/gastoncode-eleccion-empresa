"""Auth database — TinyDB persistence for users, profiles, and reset tokens."""

from pathlib import Path
import os

from tinydb import TinyDB

SERVICE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = SERVICE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = Path(os.getenv("AUTH_DB_PATH", str(DATA_DIR / "auth.json")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(DB_PATH)

users_table = db.table("users")
profiles_table = db.table("profiles")
reset_tokens_table = db.table("reset_tokens")
