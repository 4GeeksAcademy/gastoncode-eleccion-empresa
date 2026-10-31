from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


class Ingredient(SQLModel, table=True):
    __tablename__ = "ingredients"
    __table_args__ = (
        UniqueConstraint("sku", name="uq_ingredients_sku"),
        CheckConstraint("country IN ('CO', 'US')", name="ck_ingredients_country"),
        CheckConstraint(
            "category IN ('meat', 'produce', 'sauce', 'beverage', 'packaging', 'cleaning')",
            name="ck_ingredients_category",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=64, index=True)
    unit: str = Field(min_length=1, max_length=32)
    category: str = Field(min_length=1, max_length=32)
    country: str = Field(min_length=2, max_length=2)


class IngredientEntry(SQLModel, table=True):
    __tablename__ = "ingredient_entries"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_ingredient_entries_quantity_positive"),
        CheckConstraint("location_id BETWEEN 1 AND 14", name="ck_ingredient_entries_location"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    ingredient_id: int = Field(foreign_key="ingredients.id", index=True)
    quantity: float = Field(gt=0)
    supplier_name: str = Field(min_length=1, max_length=200)
    location_id: int = Field(ge=1, le=14)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        index=True,
    )
    user_uuid: str = Field(min_length=1, max_length=64, index=True)


class IngredientExit(SQLModel, table=True):
    __tablename__ = "ingredient_exits"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_ingredient_exits_quantity_positive"),
        CheckConstraint("reason IN ('consumption', 'waste')", name="ck_ingredient_exits_reason"),
        CheckConstraint("location_id BETWEEN 1 AND 14", name="ck_ingredient_exits_location"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    ingredient_id: int = Field(foreign_key="ingredients.id", index=True)
    quantity: float = Field(gt=0)
    reason: str = Field(min_length=1, max_length=16)
    location_id: int = Field(ge=1, le=14)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        index=True,
    )
    user_uuid: str = Field(min_length=1, max_length=64, index=True)
