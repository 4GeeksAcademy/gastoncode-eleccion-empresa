import logging
import os
from collections import OrderedDict
from pathlib import Path
from threading import Lock
from time import time
from typing import get_args
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import UUID4, ValidationError
from tinydb import TinyDB, Query as AnalysisQuery

try:
    from packages.incidents_analysis import analyze_csv_text, summary_to_csv
except ImportError as error:
    raise RuntimeError(
        "No se encuentra 'packages.incidents_analysis'. "
        "Verifica que el archivo monorepo.pth existe en .venv/lib/python3.*/site-packages/ "
        "o ejecuta 'uv sync'."
    ) from error

# Autenticación delegada a api-auth (token JWT compartido)
from auth import get_current_user, require_roles
from models import (
    Incident,
    IncidentBranch,
    IncidentCategory,
    IncidentCreate,
    IncidentOrigin,
    IncidentStatus,
    IncidentStatusUpdate,
    IncidentSummary,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("api-incidents")

app = FastAPI(
    title="Brasaland Incidents API",
    version="1.0.0",
)

# ── CORS configurable via variable de entorno ──────────────
cors_origins = os.getenv("CORS_ORIGINS", "*")
origins = cors_origins.split(",") if cors_origins != "*" else ["*"]
origins = [o.strip() for o in origins if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Persistencia con TinyDB (rutas configurables por entorno) ─
SERVICE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("ANALYSES_DB_PATH", str(SERVICE_DIR / "analyses.json")))
db = TinyDB(str(DB_PATH))
ANALYSES_TABLE = db.table("analyses")
_analyses_db_lock = Lock()
INCIDENTS_DB_PATH = Path(os.getenv("INCIDENTS_DB_PATH", str(SERVICE_DIR / "incidents.json")))
_incidents_lock = Lock()

# ── Caché LRU en memoria con lock para thread-safety ──────
MAX_ANALYSES_CACHE = 100
analyses_cache: OrderedDict[str, dict] = OrderedDict()
_cache_lock = Lock()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ────────────────────────────────────────────────────────────
#  Endpoints
# ────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Brasaland Incidents API is running"}


@app.get("/health")
def health():
    """Health check con estadísticas del almacén."""
    with _cache_lock:
        cached_analyses = len(analyses_cache)
    with _analyses_db_lock:
        persisted_analyses = len(ANALYSES_TABLE)
    return {
        "status": "healthy",
        "cached_analyses": cached_analyses,
        "persisted_analyses": persisted_analyses,
    }


def validation_error(field: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail=[{"field": field, "message": message}],
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    messages = {
        "missing": "Este campo es obligatorio.",
        "string_too_short": "Este campo es obligatorio.",
        "extra_forbidden": "Este campo no esta permitido.",
        "json_invalid": "El cuerpo debe contener JSON valido.",
        "model_attributes_type": "El cuerpo debe ser un objeto JSON.",
        "dict_type": "El valor debe ser un objeto JSON.",
        "uuid_parsing": "Debe ser un UUID v4 valido.",
        "uuid_type": "Debe ser un UUID v4 valido.",
        "uuid_version": "Debe ser un UUID v4 valido.",
    }
    details = []
    for error in exc.errors():
        location = error["loc"]
        field = ".".join(str(part) for part in location)
        message = messages.get(error["type"], error["msg"])
        if error["type"] == "literal_error":
            message = f"Valor no permitido. Se espera: {error['ctx']['expected']}."
        if error["type"] == "json_invalid":
            field = "body"
        details.append({"field": field, "message": message})
    return JSONResponse(status_code=400, content={"detail": details})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    route = request.scope.get("route")
    route_template = getattr(route, "path", "unknown")
    logger.exception(
        "Error no manejado en %s %s",
        request.method,
        route_template,
    )
    return Response(
        status_code=500,
        content='{"detail":"Error interno del servidor"}',
        media_type="application/json",
    )


@app.get("/api/incidents", response_model=list[Incident])
def list_incidents(
    status: IncidentStatus | None = Query(default=None),
    origin: IncidentOrigin | None = Query(default=None),
    branch: IncidentBranch | None = Query(default=None),
    category: IncidentCategory | None = Query(default=None),
    _user: dict = Depends(get_current_user),
):
    filters = {
        "status": status,
        "origin": origin,
        "branch": branch,
        "category": category,
    }
    # Abrir por solicitud evita conservar una cache obsoleta tras ejecutar el seed.
    with _incidents_lock, TinyDB(INCIDENTS_DB_PATH) as incidents_db:
        table = incidents_db.table("incidents")
        condition = AnalysisQuery().noop()
        for field, value in filters.items():
            if value is not None:
                condition &= AnalysisQuery()[field] == value
        documents = table.search(condition)
    return documents


@app.post("/api/incidents", response_model=Incident, status_code=201)
def create_incident(
    payload: IncidentCreate,
    _user: dict = Depends(get_current_user),
):
    for field in ("title", "description"):
        if not getattr(payload, field).strip():
            raise validation_error(f"body.{field}", "Este campo no puede estar vacio.")
    if payload.origin == "branch" and payload.branch == "central":
        raise validation_error(
            "body.branch",
            "Si el origen es una sede, selecciona una sede especifica.",
        )
    incident = Incident(**payload.model_dump(), status="open")
    with _incidents_lock, TinyDB(INCIDENTS_DB_PATH) as incidents_db:
        incidents_db.table("incidents").insert(incident.model_dump(mode="json"))
    return incident


@app.post("/api/incidents/analyze")
def analyze_incidents(
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise validation_error("body.file", "El fichero no tiene nombre.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="El fichero debe tener extensión .csv.")

    # Validación adicional de Content-Type
    if file.content_type and file.content_type not in (
        "text/csv",
        "text/plain",
        "application/vnd.ms-excel",
        "application/octet-stream",
        None,
    ):
        logger.warning("Content-Type inesperado al subir un CSV")

    # Leer el archivo en chunks hasta MAX_FILE_SIZE
    content = bytearray()
    while chunk := file.file.read(8192):
        content.extend(chunk)
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="El archivo excede el tamaño máximo permitido (10 MB).",
            )

    if not content:
        raise validation_error("body.file", "El fichero está vacío.")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise validation_error(
            "body.file", "El fichero debe utilizar codificación UTF-8."
        ) from error

    try:
        result = analyze_csv_text(text=text, source_file=file.filename)
    except ValueError as error:
        raise validation_error("body.file", str(error)) from error

    analysis_id = str(uuid4())

    # Persistir en TinyDB
    with _analyses_db_lock:
        ANALYSES_TABLE.insert({"analysis_id": analysis_id, "result": result, "created_at": time()})

    # Guardar en caché LRU (bajo lock para thread-safety)
    with _cache_lock:
        analyses_cache[analysis_id] = result
        analyses_cache.move_to_end(analysis_id)
        if len(analyses_cache) > MAX_ANALYSES_CACHE:
            analyses_cache.popitem(last=False)

    return {"analysis_id": analysis_id}


def _validate_analysis_id(analysis_id: str) -> None:
    """Valida que analysis_id sea un UUID v4."""
    try:
        if UUID(analysis_id).version != 4:
            raise ValueError("El UUID no es de version 4.")
    except ValueError as error:
        raise validation_error(
            "analysis_id", "El ID proporcionado no tiene un formato UUID v4 válido."
        ) from error


@app.get("/api/incidents/results/export")
def export_results(
    analysis_id: str = Query(..., description="ID del análisis a exportar"),
    _user: dict = Depends(get_current_user),
):
    """Exporta resultados como CSV."""
    _validate_analysis_id(analysis_id)
    result = _get_analysis(analysis_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró un análisis con el ID proporcionado.",
        )

    try:
        csv_content = summary_to_csv(result)
    except Exception as error:
        logger.exception("Error al generar CSV para %s", analysis_id)
        raise HTTPException(
            status_code=500,
            detail="Error interno al generar el CSV.",
        ) from error

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )


@app.get("/api/incidents/results/{analysis_id}")
def get_results(
    analysis_id: str,
    _user: dict = Depends(get_current_user),
):
    """Obtiene los resultados completos de un análisis por su ID."""
    _validate_analysis_id(analysis_id)
    result = _get_analysis(analysis_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró un análisis con el ID proporcionado.",
        )
    return {"analysis_id": analysis_id, **result}


@app.get("/api/incidents/summary", response_model=IncidentSummary)
def get_incidents_summary(
    _user: dict = Depends(get_current_user),
):
    with _incidents_lock, TinyDB(INCIDENTS_DB_PATH) as incidents_db:
        documents = incidents_db.table("incidents").all()
    counts = {
        "status": dict.fromkeys(get_args(IncidentStatus), 0),
        "category": dict.fromkeys(get_args(IncidentCategory), 0),
        "origin": dict.fromkeys(get_args(IncidentOrigin), 0),
        "branch": dict.fromkeys(get_args(IncidentBranch), 0),
    }
    for document in documents:
        incident = Incident.model_validate(document)
        for field, totals in counts.items():
            totals[getattr(incident, field)] += 1
    return {
        "total": len(documents),
        "by_status": counts["status"],
        "by_category": counts["category"],
        "by_origin": counts["origin"],
        "by_branch": counts["branch"],
    }


@app.get("/api/incidents/{id}", response_model=Incident)
def get_incident(
    id: UUID4,
    _user: dict = Depends(get_current_user),
):
    with _incidents_lock, TinyDB(INCIDENTS_DB_PATH) as incidents_db:
        document = incidents_db.table("incidents").get(
            AnalysisQuery().id == str(id)
        )
    if document is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontro una incidencia con el ID proporcionado.",
        )
    return document


@app.patch("/api/incidents/{id}/status", response_model=Incident)
def update_incident_status(
    id: UUID4,
    payload: IncidentStatusUpdate,
    _user: dict = Depends(get_current_user),
):
    with _incidents_lock, TinyDB(INCIDENTS_DB_PATH) as incidents_db:
        table = incidents_db.table("incidents")
        document = table.get(AnalysisQuery().id == str(id))
        if document is None:
            raise HTTPException(
                status_code=404,
                detail="No se encontro una incidencia con el ID proporcionado.",
            )
        incident = Incident.model_validate(document)
        if payload.status == incident.status:
            return incident
        try:
            updated = incident.update(status=payload.status)
        except ValidationError:
            raise
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        table.update(
            updated.model_dump(mode="json", include={"status", "updated_at"}),
            doc_ids=[document.doc_id],
        )
    return updated


# ────────────────────────────────────────────────────────────
#  Internals
# ────────────────────────────────────────────────────────────

def _get_analysis(analysis_id: str) -> dict | None:
    """Busca un análisis: primero en caché LRU, después en TinyDB."""
    with _cache_lock:
        result = analyses_cache.get(analysis_id)
        if result is not None:
            analyses_cache.move_to_end(analysis_id)
            return result

    with _analyses_db_lock:
        doc = ANALYSES_TABLE.get(AnalysisQuery().analysis_id == analysis_id)
    if doc is None:
        return None

    result = doc["result"]
    # Promover a caché (bajo lock para evitar condiciones de carrera)
    with _cache_lock:
        analyses_cache[analysis_id] = result
        analyses_cache.move_to_end(analysis_id)
        if len(analyses_cache) > MAX_ANALYSES_CACHE:
            analyses_cache.popitem(last=False)
    return result


if __name__ == "__main__":
    import uvicorn
    reload = os.getenv("UVICORN_RELOAD", "0").lower() in ("1", "true", "yes")
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=reload)
