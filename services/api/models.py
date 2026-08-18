from pydantic import BaseModel, ConfigDict
from datetime import datetime


class SupplierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    country: str
    categories: [
    "carne",
    "verduras_y_hortalizas",
    "salsas_y_condimentos",
    "bebidas",
    "packaging",
    "productos_limpieza",
    "lacteos",
    "carbon_y_combustible"
]
    rate_per_unit: float
    currency: str
    updated_at: datetime
    status: ["active", "suspended"]
    contact_email: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_unit: float | None = None
    status: ["active", "suspended"] | None = None