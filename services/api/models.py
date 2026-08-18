from pydantic import BaseModel, ConfigDict
from datetime import datetime


class SupplierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    country: ["Colombia", "USA"]
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
    currency: ["COP", "USD"]
    updated_at: datetime
    status: ["active", "suspended"]
    contact_email: str | None = None
    notes: str | None = None


class SupplierRateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_unit: float

class SupplierStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ["active", "suspended"]