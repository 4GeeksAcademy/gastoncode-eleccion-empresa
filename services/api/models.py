from pydantic import BaseModel, ConfigDict, Field, EmailStr
from datetime import datetime
from typing import Literal


class SupplierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    country: Literal["Colombia","USA"]
    categories: list[Literal[
        "carne",
        "verduras_y_hortalizas",
        "salsas_y_condimentos",
        "bebidas",
        "packaging",
        "productos_limpieza",
        "lacteos",
        "carbon_y_combustible"
    ]] = Field(min_length=1)
    rate_per_unit: float
    currency: Literal["COP","USD"]
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["active","suspended"]
    contact_email: EmailStr | None = None
    notes: str | None = None


class SupplierRateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_unit: float

class SupplierStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["active","suspended"]