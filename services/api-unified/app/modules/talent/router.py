"""Talent router — candidate records and notes from external tracker."""

from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response

from app.modules.auth.auth import get_current_user, require_roles
from app.modules.talent.models import (
    CandidateDetail,
    CandidateInput,
    CandidateUpdate,
    Note,
    NoteInput,
    RecordsResponse,
    Stage,
    Status,
)
from app.modules.talent.tracker import tracker_request


router = APIRouter(
    prefix="/talent",
    tags=["Talent"],
    dependencies=[Depends(get_current_user)],
)
ResourceId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{1,128}$")]


@router.get("/records", response_model=RecordsResponse)
def list_records(
    status: Status | None = None,
    stage: Stage | None = None,
    search: str = Query(default="", max_length=300),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=9, ge=1, le=1000),
    _user: dict = Depends(require_roles(["admin", "manager"])),
):
    query = {"page": page, "limit": limit}
    for field, value in (("status", status), ("stage", stage), ("search", search)):
        if value:
            query[field] = value
    return tracker_request("GET", f"records?{urlencode(query)}")


@router.post("/records", status_code=201, response_model=CandidateDetail)
def create_record(
    candidate: CandidateInput,
    _user: dict = Depends(require_roles(["admin", "manager"])),
):
    return tracker_request("POST", "records", candidate.model_dump(mode="json", exclude_none=True))


@router.get("/records/{record_id}", response_model=CandidateDetail)
def get_record(
    record_id: ResourceId,
    _user: dict = Depends(require_roles(["admin", "manager"])),
):
    return tracker_request("GET", f"records/{record_id}")


@router.patch("/records/{record_id}", status_code=204)
def update_record(
    record_id: ResourceId,
    update: CandidateUpdate,
    _user: dict = Depends(require_roles(["admin", "manager"])),
):
    tracker_request("PATCH", f"records/{record_id}", update.model_dump())
    return Response(status_code=204)


@router.get("/records/{record_id}/notes", response_model=list[Note])
def list_notes(
    record_id: ResourceId,
    _user: dict = Depends(require_roles(["admin", "manager"])),
):
    result = tracker_request("GET", f"records/{record_id}/notes")
    if isinstance(result, dict):
        result = result.get("data")
    if not isinstance(result, list):
        raise HTTPException(502, "Respuesta del proveedor no valida")
    return result


@router.post("/records/{record_id}/notes", status_code=201)
def create_note(
    record_id: ResourceId,
    note: NoteInput,
    _user: dict = Depends(require_roles(["admin", "manager"])),
):
    tracker_request("POST", f"records/{record_id}/notes", note.model_dump())
    return {"message": "Nota agregada"}


@router.delete("/records/{record_id}/notes/{note_id}", status_code=204)
def delete_note(
    record_id: ResourceId,
    note_id: ResourceId,
    _user: dict = Depends(require_roles(["admin", "manager"])),
):
    tracker_request("DELETE", f"records/{record_id}/notes/{note_id}")
    return Response(status_code=204)
