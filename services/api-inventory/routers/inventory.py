from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from auth import get_current_user, require_roles
from database import get_session
from models import Ingredient, IngredientEntry, IngredientExit
from schemas import (
    IngredientCreate,
    IngredientEntryCreate,
    IngredientExitCreate,
    IngredientOrderResponse,
    IngredientResponse,
)


router = APIRouter(prefix="/inventory", tags=["Inventory"])
WRITERS = ["admin", "manager"]


def _stock(session: Session, ingredient_id: int) -> float:
    entries = session.exec(
        select(func.coalesce(func.sum(IngredientEntry.quantity), 0.0)).where(
            IngredientEntry.ingredient_id == ingredient_id
        )
    ).one()
    exits = session.exec(
        select(func.coalesce(func.sum(IngredientExit.quantity), 0.0)).where(
            IngredientExit.ingredient_id == ingredient_id
        )
    ).one()
    return float(entries - exits)


def _ingredient_response(session: Session, ingredient: Ingredient) -> IngredientResponse:
    return IngredientResponse(
        id=ingredient.id,
        name=ingredient.name,
        sku=ingredient.sku,
        unit=ingredient.unit,
        category=ingredient.category,
        country=ingredient.country,
        current_stock=_stock(session, ingredient.id),
    )


@router.get("/products", response_model=list[IngredientResponse])
def list_ingredients(
    session: Session = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    ingredients = session.exec(select(Ingredient).order_by(Ingredient.id)).all()
    return [_ingredient_response(session, ingredient) for ingredient in ingredients]


@router.post(
    "/products",
    response_model=IngredientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ingredient(
    data: IngredientCreate,
    session: Session = Depends(get_session),
    _user: dict = Depends(require_roles(WRITERS)),
):
    existing = session.exec(select(Ingredient).where(Ingredient.sku == data.sku)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ingredient SKU already exists")
    ingredient = Ingredient.model_validate(data)
    session.add(ingredient)
    session.commit()
    session.refresh(ingredient)
    return _ingredient_response(session, ingredient)


@router.get("/products/{ingredient_id}", response_model=IngredientResponse)
def get_ingredient(
    ingredient_id: int,
    session: Session = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    ingredient = session.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return _ingredient_response(session, ingredient)


@router.post(
    "/orders/inbound",
    response_model=IngredientOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_entry(
    data: IngredientEntryCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_roles(WRITERS)),
):
    ingredient = session.get(Ingredient, data.ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    entry = IngredientEntry(
        **data.model_dump(),
        user_uuid=current_user["id"],
        created_at=datetime.now(timezone.utc),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return IngredientOrderResponse(
        id=entry.id,
        type="inbound",
        ingredient_id=entry.ingredient_id,
        ingredient_name=ingredient.name,
        quantity=entry.quantity,
        supplier_name=entry.supplier_name,
        reason=None,
        location_id=entry.location_id,
        created_at=entry.created_at,
        user_uuid=entry.user_uuid,
    )


@router.post(
    "/orders/outbound",
    response_model=IngredientOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_exit(
    data: IngredientExitCreate,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_roles(WRITERS)),
):
    # Lock the ingredient row so concurrent exits serialize before calculating stock.
    ingredient = session.exec(
        select(Ingredient)
        .where(Ingredient.id == data.ingredient_id)
        .with_for_update()
    ).first()
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    available = _stock(session, ingredient.id)
    if data.quantity > available:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock for ingredient '{ingredient.name}'. "
                f"Available: {available}, requested: {data.quantity}."
            ),
        )

    exit_order = IngredientExit(
        **data.model_dump(),
        user_uuid=current_user["id"],
        created_at=datetime.now(timezone.utc),
    )
    session.add(exit_order)
    session.commit()
    session.refresh(exit_order)
    return IngredientOrderResponse(
        id=exit_order.id,
        type="outbound",
        ingredient_id=exit_order.ingredient_id,
        ingredient_name=ingredient.name,
        quantity=exit_order.quantity,
        supplier_name=None,
        reason=exit_order.reason,
        location_id=exit_order.location_id,
        created_at=exit_order.created_at,
        user_uuid=exit_order.user_uuid,
    )


@router.get("/orders", response_model=list[IngredientOrderResponse])
def list_orders(
    session: Session = Depends(get_session),
    _user: dict = Depends(get_current_user),
):
    ingredients = {item.id: item for item in session.exec(select(Ingredient)).all()}
    entries = session.exec(select(IngredientEntry)).all()
    exits = session.exec(select(IngredientExit)).all()
    orders = [
        IngredientOrderResponse(
            id=entry.id,
            type="inbound",
            ingredient_id=entry.ingredient_id,
            ingredient_name=ingredients[entry.ingredient_id].name,
            quantity=entry.quantity,
            supplier_name=entry.supplier_name,
            reason=None,
            location_id=entry.location_id,
            created_at=entry.created_at,
            user_uuid=entry.user_uuid,
        )
        for entry in entries
    ] + [
        IngredientOrderResponse(
            id=exit_order.id,
            type="outbound",
            ingredient_id=exit_order.ingredient_id,
            ingredient_name=ingredients[exit_order.ingredient_id].name,
            quantity=exit_order.quantity,
            supplier_name=None,
            reason=exit_order.reason,
            location_id=exit_order.location_id,
            created_at=exit_order.created_at,
            user_uuid=exit_order.user_uuid,
        )
        for exit_order in exits
    ]
    return sorted(orders, key=lambda order: order.created_at, reverse=True)
