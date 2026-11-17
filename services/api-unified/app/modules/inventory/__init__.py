from app.modules.inventory.router import router as inventory_router
from app.modules.inventory.database import create_db_and_tables

__all__ = ["inventory_router", "create_db_and_tables"]
