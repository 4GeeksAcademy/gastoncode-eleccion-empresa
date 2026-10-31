"""Insert the Brasaland demo inventory into an empty inventory database.

Supply UUIDs obtained from the existing TinyDB-backed auth service. They are
accepted only as arguments and are never written into repository configuration.
"""
import argparse
import sys
from pathlib import Path

from sqlmodel import Session, select

from database import create_db_and_tables, engine
from models import Ingredient, IngredientEntry, IngredientExit


SEED_INGREDIENTS = [
    {"name": "Falda de ternera", "sku": "BRS-BEEF-001", "unit": "kg", "category": "meat", "country": "CO"},
    {"name": "Costilla de cerdo", "sku": "BRS-PORK-001", "unit": "kg", "category": "meat", "country": "US"},
    {"name": "Chimichurri", "sku": "BRS-SAUCE-001", "unit": "litro", "category": "sauce", "country": "CO"},
    {"name": "Salsa BBQ de la casa", "sku": "BRS-SAUCE-002", "unit": "litro", "category": "sauce", "country": "US"},
    {"name": "Yuca", "sku": "BRS-PROD-001", "unit": "kg", "category": "produce", "country": "CO"},
    {"name": "Caja para llevar (M)", "sku": "BRS-PKG-001", "unit": "unidad", "category": "packaging", "country": "CO"},
]


def seed(inbound_user_uuid: str, outbound_user_uuid: str) -> bool:
    create_db_and_tables()
    with Session(engine) as session:
        if session.exec(select(Ingredient.id).limit(1)).first() is not None:
            print("Inventory already contains ingredients; seed skipped to avoid mixing demo data with existing records.")
            return False

        ingredients = [Ingredient(**item) for item in SEED_INGREDIENTS]
        session.add_all(ingredients)
        session.flush()
        by_sku = {ingredient.sku: ingredient for ingredient in ingredients}

        entries = [
            IngredientEntry(ingredient_id=by_sku["BRS-BEEF-001"].id, quantity=50, supplier_name="Carnes del Valle S.A.", location_id=1, user_uuid=inbound_user_uuid),
            IngredientEntry(ingredient_id=by_sku["BRS-BEEF-001"].id, quantity=30, supplier_name="MiamiMeat Co.", location_id=2, user_uuid=inbound_user_uuid),
            IngredientEntry(ingredient_id=by_sku["BRS-SAUCE-001"].id, quantity=12, supplier_name="Salsas Artesanales Ltda.", location_id=1, user_uuid=inbound_user_uuid),
            IngredientEntry(ingredient_id=by_sku["BRS-PROD-001"].id, quantity=40, supplier_name="Verduras La Cosecha", location_id=1, user_uuid=inbound_user_uuid),
        ]
        exits = [
            IngredientExit(ingredient_id=by_sku["BRS-BEEF-001"].id, quantity=8, reason="consumption", location_id=1, user_uuid=outbound_user_uuid),
            IngredientExit(ingredient_id=by_sku["BRS-PROD-001"].id, quantity=5, reason="consumption", location_id=1, user_uuid=outbound_user_uuid),
            IngredientExit(ingredient_id=by_sku["BRS-SAUCE-001"].id, quantity=1, reason="waste", location_id=1, user_uuid=outbound_user_uuid),
        ]
        session.add_all(entries + exits)
        session.commit()
    print("Inserted 6 ingredients, 4 entries, and 3 exits.")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inbound-user-uuid", required=True, help="Existing TinyDB user UUID for supplier entries")
    parser.add_argument("--outbound-user-uuid", required=True, help="Existing TinyDB user UUID for ingredient exits")
    args = parser.parse_args()
    try:
        seed(args.inbound_user_uuid, args.outbound_user_uuid)
    except Exception as error:
        # Do not print exception text: SQL exceptions may contain database URLs.
        print(f"Inventory seed failed ({type(error).__name__}).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
