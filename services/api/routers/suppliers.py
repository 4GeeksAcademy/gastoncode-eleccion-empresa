from fastapi import APIRouter, HTTPException
from tinydb import Query

from ..database import suppliers_table
from ..models import SupplierCreateInput, SupplierRateUpdate, SupplierStatusUpdate, SupplierResponse
from datetime import datetime, timezone


router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"]
)


def serialize_document(document):
    return {
        "id": document.doc_id,
        **document
    }

@router.post("", response_model=SupplierResponse)

def create_supplier(supplier: SupplierCreateInput):

    supplier_data = supplier.model_dump()
    supplier_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    doc_id = suppliers_table.insert(supplier_data)

    return SupplierResponse.model_validate({
        "id": doc_id,
        **supplier_data
    })


@router.get("", response_model=list[SupplierResponse])
def get_suppliers():

    documents = suppliers_table.all()

    return [
        serialize_document(document)
        for document in documents
    ]


@router.get("/search", response_model=list[SupplierResponse])
def search_suppliers(
    country: str | None = None,
    categories: str | None = None
):

    country = country.strip() if country is not None else None
    categories = categories.strip() if categories is not None else None

    SupplierQuery = Query()

    condition = None

    if country is not None and country != "":
        condition = SupplierQuery.country == country

    if categories is not None and categories != "":
        categories_condition = SupplierQuery.categories.any(categories)

        condition = (
            categories_condition
            if condition is None
            else condition & categories_condition
        )

    if condition is None:
        documents = suppliers_table.all()
    else:
        documents = suppliers_table.search(condition)

    return [
        serialize_document(document)
        for document in documents
    ]


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int):

    document = suppliers_table.get(
        doc_id=supplier_id
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    return serialize_document(document)


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(
    supplier_id: int,
    supplier_rate: SupplierRateUpdate
):

    document = suppliers_table.get(
        doc_id=supplier_id
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    changes = supplier_rate.model_dump(
        exclude_unset=True
    )

    if changes:
        suppliers_table.update(
            changes,
            doc_ids=[supplier_id]
        )
        suppliers_table.update(
            {"updated_at": datetime.now(timezone.utc).isoformat()},
            doc_ids=[supplier_id]
        )

    updated_document = suppliers_table.get(
        doc_id=supplier_id
    )

    return serialize_document(
        updated_document
    )


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(
    supplier_id: int,
    supplier_status: SupplierStatusUpdate
):

    document = suppliers_table.get(
        doc_id=supplier_id
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    changes = supplier_status.model_dump(
        exclude_unset=True
    )

    if changes:
        suppliers_table.update(
            changes,
            doc_ids=[supplier_id]
        )

        suppliers_table.update(
            {"updated_at": datetime.now(timezone.utc).isoformat()},
            doc_ids=[supplier_id]
        )

    updated_document = suppliers_table.get(
        doc_id=supplier_id
    )

    return serialize_document(
        updated_document
    )


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int):

    document = suppliers_table.get(
        doc_id=supplier_id
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found"
        )

    suppliers_table.remove(
        doc_ids=[supplier_id]
    )

    return {
        "message": "Supplier deleted",
        "id": supplier_id
    }