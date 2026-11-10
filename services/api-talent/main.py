from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Query, Response
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse

from auth import get_current_user
from models import CandidateDetail, CandidateInput, CandidateUpdate, Note, NoteInput, RecordsResponse, Stage, Status
from tracker import tracker_request

app = FastAPI(title="Brasaland Talent API", description="Prototype: synthetic candidate data only")
router = APIRouter(prefix="/talent", dependencies=[Depends(get_current_user)])
ResourceId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{1,128}$")]


@app.exception_handler(RequestValidationError)
async def invalid_request(_request, _error):
    return JSONResponse(status_code=422, content={"detail": "Revisa los campos ingresados"})


@app.exception_handler(ResponseValidationError)
async def invalid_response(_request, _error):
    return JSONResponse(status_code=502, content={"detail": "Respuesta del proveedor no valida"})


@app.get("/")
def health():
    return {"status": "ok", "service": "talent", "synthetic_data_only": True}


@router.get("/records", response_model=RecordsResponse)
def list_records(
    status: Status | None = None,
    stage: Stage | None = None,
    search: str = Query(default="", max_length=300),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=9, ge=1, le=1000),
):
    query = {"page": page, "limit": limit}
    for field, value in (("status", status), ("stage", stage), ("search", search)):
        if value:
            query[field] = value
    return tracker_request("GET", f"records?{urlencode(query)}")


@router.post("/records", status_code=201, response_model=CandidateDetail)
def create_record(candidate: CandidateInput):
    return tracker_request("POST", "records", candidate.model_dump(mode="json", exclude_none=True))


@router.get("/records/{record_id}", response_model=CandidateDetail)
def get_record(record_id: ResourceId):
    return tracker_request("GET", f"records/{record_id}")


@router.patch("/records/{record_id}", status_code=204)
def update_record(record_id: ResourceId, update: CandidateUpdate):
    tracker_request("PATCH", f"records/{record_id}", update.model_dump())
    return Response(status_code=204)


@router.get("/records/{record_id}/notes", response_model=list[Note])
def list_notes(record_id: ResourceId):
    result = tracker_request("GET", f"records/{record_id}/notes")
    if isinstance(result, dict):
        result = result.get("data")
    if not isinstance(result, list):
        raise HTTPException(502, "Respuesta del proveedor no valida")
    return result


@router.post("/records/{record_id}/notes", status_code=201)
def create_note(record_id: ResourceId, note: NoteInput):
    tracker_request("POST", f"records/{record_id}/notes", note.model_dump())
    return {"message": "Nota agregada"}


@router.delete("/records/{record_id}/notes/{note_id}", status_code=204)
def delete_note(record_id: ResourceId, note_id: ResourceId):
    tracker_request("DELETE", f"records/{record_id}/notes/{note_id}")
    return Response(status_code=204)


app.include_router(router)