from fastapi import APIRouter, HTTPException
from tinydb import Query

from database import suppliers_table
from models import SupplierCreate, SupplierRateUpdate, SupplierStatusUpdate
from datetime import datetime


router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"]
)


def serialize_document(document):
    return {
        "id": document.doc_id,
        **document
    }

@router.post("")

def create_supplier(supplier: SupplierCreate):

    supplier_data = supplier.model_dump()

    doc_id = suppliers_table.insert(supplier_data)

    return {
        "id": doc_id,
        **supplier_data
    }


@router.get("")
def get_suppliers():

    documents = suppliers_table.all()

    return [
        serialize_document(document)
        for document in documents
    ]


@router.get("/search")
def search_suppliers(
    country: str,
    categories: str
):

    ContactQuery = Query()

    condition = None

    if country is not None:
        condition = ContactQuery.country == country

    if categories is not None:

        categories_condition = ContactQuery.categories == categories

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


@router.get("/{supplier_id}")
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


@router.patch("/{supplier_id}/rate")
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

    if supplier_rate.rate_per_unit <= 0:
        raise HTTPException(
            status_code=422,
            detail="New rate should be bigger than 0"
        )

    if changes and supplier_rate.rate_per_unit > 0:
        suppliers_table.update(
            changes,
            doc_ids=[supplier_id]
        )
        suppliers_table.update(
            {"updated_at": datetime.now()},
            doc_ids=[supplier_id]
        )

    updated_document = suppliers_table.get(
        doc_id=supplier_id
    )

    return serialize_document(
        updated_document
    )


@router.patch("/{supplier_id}/status")
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

    if supplier_status.status not in ["active", "suspended"]:
        raise HTTPException(
            status_code=422,
            detail="Supplier status must be 'active' or 'suspended'"
        )

    changes = supplier_status.model_dump(
        exclude_unset=True
    )

    if changes:
        suppliers_table.update(
            changes,
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