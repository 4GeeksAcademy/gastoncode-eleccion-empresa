from tinydb import TinyDB
from pathlib import Path
import os


DB_PATH = Path(os.getenv("SUPPLIERS_DB_PATH", str(Path(__file__).with_name("db.json"))))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(DB_PATH)

suppliers_table = db.table("suppliers")