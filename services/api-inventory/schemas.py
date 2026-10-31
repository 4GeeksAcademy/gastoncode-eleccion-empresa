from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Category = Literal["meat", "produce", "sauce", "beverage", "packaging", "cleaning"]
Country = Literal["CO", "US"]
ExitReason = Literal["consumption", "waste"]


class IngredientCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=64)
    unit: str = Field(min_length=1, max_length=32)
    category: Category
    country: Country


class IngredientResponse(IngredientCreate):
    id: int
    current_stock: float


class IngredientEntryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ingredient_id: int = Field(gt=0)
    quantity: float = Field(gt=0, allow_inf_nan=False)
    supplier_name: str = Field(min_length=1, max_length=200)
    location_id: int = Field(ge=1, le=14)


class IngredientExitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ingredient_id: int = Field(gt=0)
    quantity: float = Field(gt=0, allow_inf_nan=False)
    reason: ExitReason
    location_id: int = Field(ge=1, le=14)


class IngredientOrderResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    type: Literal["inbound", "outbound"]
    ingredient_id: int
    ingredient_name: str
    quantity: float
    supplier_name: str | None = None
    reason: ExitReason | None = None
    location_id: int
    created_at: datetime
    user_uuid: str
