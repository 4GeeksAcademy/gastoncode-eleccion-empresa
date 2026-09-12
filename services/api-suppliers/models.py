from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Literal


class SupplierCreateInput(BaseModel):
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
    rate_per_unit: float = Field(gt=0)
    currency: Literal["COP","USD"]
    status: Literal["active","suspended"]
    contact_email: EmailStr | None = None
    notes: str | None = None
    
class SupplierResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
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
    rate_per_unit: float = Field(gt=0)
    currency: Literal["COP","USD"]
    status: Literal["active","suspended"]
    contact_email: EmailStr | None = None
    notes: str | None = None
    updated_at: str | None = None


class SupplierRateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rate_per_unit: float = Field(gt=0)

class SupplierStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["active","suspended"]