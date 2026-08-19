from tinydb import TinyDB
from pathlib import Path


db = TinyDB(Path(__file__).with_name("db.json"))

suppliers_table = db.table("suppliers")