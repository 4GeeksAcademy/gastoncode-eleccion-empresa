import logging
import os
from collections import OrderedDict
from pathlib import Path
from threading import Lock
from time import time
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
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

# ── Persistencia con TinyDB (ruta fija respecto a este archivo) ─
DB_PATH = Path(__file__).resolve().parent / "analyses.json"
db = TinyDB(str(DB_PATH))
ANALYSES_TABLE = db.table("analyses")

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
    return {
        "status": "healthy",
        "cached_analyses": len(analyses_cache),
        "persisted_analyses": len(ANALYSES_TABLE),
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Error no manejado en %s", request.url)
    return Response(
        status_code=500,
        content='{"detail":"Error interno del servidor"}',
        media_type="application/json",
    )


@app.post("/api/incidents/analyze")
def analyze_incidents(
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="El fichero no tiene nombre.")

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
        logger.warning("Content-Type inesperado: %s (file=%s)", file.content_type, file.filename)

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
        raise HTTPException(status_code=400, detail="El fichero está vacío.")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=400,
            detail="El fichero debe utilizar codificación UTF-8.",
        ) from error

    try:
        result = analyze_csv_text(text=text, source_file=file.filename)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    analysis_id = str(uuid4())

    # Persistir en TinyDB
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
        UUID(analysis_id, version=4)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail="El ID proporcionado no tiene un formato UUID v4 válido.",
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


# ────────────────────────────────────────────────────────────
#  Internals
# ────────────────────────────────────────────────────────────

def _get_analysis(analysis_id: str) -> dict | None:
    """Busca un análisis: primero en caché LRU, después en TinyDB."""
    with _cache_lock:
        result = analyses_cache.get(analysis_id)
        if result is not None:
            return result

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
