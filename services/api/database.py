from tinydb import TinyDB


db = TinyDB("db.json")

suppliers_table = db.table("suppliers")