"""Suppliers router — CRUD operations on suppliers."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from tinydb import Query

from app.modules.suppliers.database import suppliers_table
from app.modules.suppliers.models import (
    SupplierCreateInput, SupplierRateUpdate, SupplierStatusUpdate, SupplierResponse,
)
from app.modules.auth.auth import get_current_user, require_roles
from app.modules.schemas import MessageResponse


router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


def serialize_document(document):
    return {"id": document.doc_id, **document}


@router.post("", response_model=SupplierResponse)
def create_supplier(supplier: SupplierCreateInput, current_user: dict = Depends(require_roles(["admin", "manager"]))):
    supplier_data = supplier.model_dump()
    supplier_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc_id = suppliers_table.insert(supplier_data)
    return SupplierResponse.model_validate({"id": doc_id, **supplier_data})


@router.get("", response_model=list[SupplierResponse])
def get_suppliers(current_user: dict = Depends(get_current_user)):
    return [serialize_document(doc) for doc in suppliers_table.all()]


@router.get("/search", response_model=list[SupplierResponse])
def search_suppliers(
    country: str | None = None,
    categories: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    country = country.strip() if country is not None else None
    categories_str = categories.strip() if categories is not None else None
    SupplierQuery = Query()
    condition = None
    if country is not None and country != "":
        condition = SupplierQuery.country == country
    if categories_str is not None and categories_str != "":
        category_list = [c.strip() for c in categories_str.split(",") if c.strip()]
        categories_condition = SupplierQuery.categories.any(category_list)
        condition = categories_condition if condition is None else condition & categories_condition
    documents = suppliers_table.all() if condition is None else suppliers_table.search(condition)
    return [serialize_document(doc) for doc in documents]


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, current_user: dict = Depends(get_current_user)):
    document = suppliers_table.get(doc_id=supplier_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return serialize_document(document)


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(supplier_id: int, supplier_rate: SupplierRateUpdate, current_user: dict = Depends(require_roles(["admin", "manager"]))):
    document = suppliers_table.get(doc_id=supplier_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    changes = supplier_rate.model_dump(exclude_unset=True)
    if changes:
        suppliers_table.update(changes, doc_ids=[supplier_id])
        suppliers_table.update({"updated_at": datetime.now(timezone.utc).isoformat()}, doc_ids=[supplier_id])
    return serialize_document(suppliers_table.get(doc_id=supplier_id))


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(supplier_id: int, supplier_status: SupplierStatusUpdate, current_user: dict = Depends(require_roles(["admin", "manager"]))):
    document = suppliers_table.get(doc_id=supplier_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    changes = supplier_status.model_dump(exclude_unset=True)
    if changes:
        suppliers_table.update(changes, doc_ids=[supplier_id])
        suppliers_table.update({"updated_at": datetime.now(timezone.utc).isoformat()}, doc_ids=[supplier_id])
    return serialize_document(suppliers_table.get(doc_id=supplier_id))


@router.delete("/{supplier_id}", response_model=MessageResponse)
def delete_supplier(supplier_id: int, current_user: dict = Depends(require_roles(["admin", "manager"]))):
    document = suppliers_table.get(doc_id=supplier_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    suppliers_table.remove(doc_ids=[supplier_id])
    return {"message": "Supplier deleted"}
