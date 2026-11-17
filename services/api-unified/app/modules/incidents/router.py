"""Incidents router — incident management and CSV analysis."""

import csv
import io
import json
import logging
import os
import sys
from collections import OrderedDict
from pathlib import Path
from threading import Lock
from time import time
from datetime import datetime
from uuid import uuid4

from fastapi import Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError
from tinydb import TinyDB, Query as AnalysisQuery

from app.modules.incidents.models import (
    AnalysisListItem,
    AnalysisResponse,
    AnalysisStatus,
    Incident,
    IncidentBranch,
    IncidentCategory,
    IncidentCreate,
    IncidentOrigin,
    IncidentStatus,
    IncidentStatusUpdate,
    IncidentSummary,
)
from app.modules.auth.auth import get_current_user, require_roles

# ── incidents_analysis ────────────────────────────────────────
# The packages/ directory lives at the repository root.
_REPO_ROOT = Path(__file__).resolve().parents[5]  # gastoncode-eleccion-empresa/
_PACKAGES_DIR = str(_REPO_ROOT / "packages")
if _PACKAGES_DIR not in sys.path:
    sys.path.insert(0, _PACKAGES_DIR)

try:
    from incidents_analysis import analyze_csv_text, summary_to_csv
except ImportError as error:
    raise RuntimeError(
        "No se encuentra 'incidents_analysis'. "
        "Verifica que packages/incidents_analysis exista."
    ) from error


logger = logging.getLogger("api-unified.incidents")

router = None  # Will be set after db init

# ── Persistencia ─────────────────────────────────────────────
SERVICE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.getenv("ANALYSES_DB_PATH", str(SERVICE_DIR / "data" / "analyses.json")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(str(DB_PATH))
ANALYSES_TABLE = db.table("analyses")
_analyses_db_lock = Lock()

INCIDENTS_DB_PATH = Path(os.getenv("INCIDENTS_DB_PATH", str(SERVICE_DIR / "data" / "incidents.json")))
INCIDENTS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
_incidents_lock = Lock()

MAX_ANALYSES_CACHE = 100
analyses_cache: OrderedDict[str, dict] = OrderedDict()
_cache_lock = Lock()
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

router = __import__("fastapi").APIRouter(
    prefix="/api",
    tags=["Incidents"],
    dependencies=[Depends(require_roles(["admin", "manager"]))],
)

# ── Helpers ──────────────────────────────────────────────────

def _load_incidents():
    try:
        with open(INCIDENTS_DB_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _save_incidents(incidents: list[dict]):
    with _incidents_lock:
        with open(INCIDENTS_DB_PATH, "w") as f:
            json.dump(incidents, f, indent=2)


def _find_incident(incident_id: str) -> tuple[int | None, dict | None]:
    incidents = _load_incidents()
    for idx, inc in enumerate(incidents):
        if inc["id"] == incident_id:
            return idx, inc
    return None, None


# ── Analysis helpers ─────────────────────────────────────────

def _cache_get(key: str):
    with _cache_lock:
        return analyses_cache.get(key)


def _cache_set(key: str, value: dict):
    with _cache_lock:
        analyses_cache[key] = value
        analyses_cache.move_to_end(key)
        while len(analyses_cache) > MAX_ANALYSES_CACHE:
            analyses_cache.popitem(last=False)


# ── Endpoints: Incidents ─────────────────────────────────────

@router.get("/incidents", tags=["Incidents"])
def list_incidents(
    status: IncidentStatus | None = None,
    category: IncidentCategory | None = None,
    branch: IncidentBranch | None = None,
    origin: IncidentOrigin | None = None,
    _user: dict = Depends(get_current_user),
):
    incidents = _load_incidents()
    if status:
        incidents = [i for i in incidents if i["status"] == status.value]
    if category:
        incidents = [i for i in incidents if i["category"] == category.value]
    if branch:
        incidents = [i for i in incidents if i["branch"] == branch.value]
    if origin:
        incidents = [i for i in incidents if i["origin"] == origin.value]
    return incidents


@router.post("/incidents", status_code=201, tags=["Incidents"])
def create_incident(data: IncidentCreate, current_user: dict = Depends(get_current_user)):
    now = time()
    incident = {
        "id": str(uuid4()),
        "title": data.title,
        "description": data.description,
        "category": data.category.value,
        "branch": data.branch.value,
        "origin": data.origin.value,
        "status": IncidentStatus.OPEN.value,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user["id"],
        "resolution_comment": None,
    }
    incidents = _load_incidents()
    incidents.append(incident)
    _save_incidents(incidents)
    return incident


@router.patch("/incidents/{incident_id}/status", tags=["Incidents"])
def update_incident_status_by_id(incident_id: str, data: IncidentStatusUpdate, current_user: dict = Depends(get_current_user)):
    idx, incident = _find_incident(incident_id)
    if idx is None:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    incidents = _load_incidents()
    incidents[idx]["status"] = data.status.value
    incidents[idx]["updated_at"] = time()
    if data.comment:
        incidents[idx]["resolution_comment"] = data.comment
    _save_incidents(incidents)
    return incidents[idx]


@router.patch("/incidents/{incident_id}", tags=["Incidents"])
def update_incident_status(incident_id: str, data: IncidentStatusUpdate, current_user: dict = Depends(get_current_user)):
    idx, incident = _find_incident(incident_id)
    if idx is None:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    incidents = _load_incidents()
    incidents[idx]["status"] = data.status.value
    incidents[idx]["updated_at"] = time()
    if data.comment:
        incidents[idx]["resolution_comment"] = data.comment
    _save_incidents(incidents)
    return incidents[idx]


@router.delete("/incidents/{incident_id}", tags=["Incidents"])
def delete_incident(incident_id: str, _user: dict = Depends(require_roles(["admin"]))):
    idx, _ = _find_incident(incident_id)
    if idx is None:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    incidents = _load_incidents()
    deleted = incidents.pop(idx)
    _save_incidents(incidents)
    return deleted


@router.get("/incidents/summary", tags=["Incidents"])
def get_summary(
    branch: IncidentBranch | None = None,
    _user: dict = Depends(get_current_user),
):
    incidents = _load_incidents()
    if branch:
        incidents = [i for i in incidents if i["branch"] == branch.value]

    total = len(incidents)

    by_status: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_origin: dict[str, int] = {}
    by_branch: dict[str, int] = {}

    for inc in incidents:
        s = inc["status"]
        by_status[s] = by_status.get(s, 0) + 1

        cat = inc["category"]
        by_category[cat] = by_category.get(cat, 0) + 1

        o = inc["origin"]
        by_origin[o] = by_origin.get(o, 0) + 1

        br = inc["branch"]
        by_branch[br] = by_branch.get(br, 0) + 1

    return IncidentSummary(
        total=total,
        by_status=by_status,
        by_category=by_category,
        by_origin=by_origin,
        by_branch=by_branch,
    )


# ── Endpoints: Analysis (CSV Upload) ─────────────────────────

@router.post("/incidents/analyze", response_model=AnalysisResponse, tags=["Analysis"])
def upload_and_analyze(
    file: UploadFile = File(...),
    title: str = Query(default="", max_length=200),
    _user: dict = Depends(get_current_user),
):
    contents = file.file.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande (máx. 10 MB)")
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="El archivo debe ser texto (UTF-8)")
    analysis_id = str(uuid4())
    created_at = datetime.now().isoformat()
    analysis: dict = {
        "id": analysis_id,
        "title": title or f"Analysis {analysis_id[:8]}",
        "status": AnalysisStatus.PROCESSING.value,
        "summary": None,
        "csv_summary": None,
        "created_at": created_at,
        "error": None,
    }
    ANALYSES_TABLE.insert(dict(analysis))
    _cache_set(analysis_id, dict(analysis))
    try:
        parsed = analyze_csv_text(text)
        csv_result = summary_to_csv(parsed) if callable(summary_to_csv) else ""
        analysis["summary"] = json.dumps(parsed, ensure_ascii=False, indent=2)
        analysis["csv_summary"] = csv_result
        analysis["status"] = AnalysisStatus.COMPLETED.value
    except Exception as exc:
        logger.error("Analysis failed (%s)", type(exc).__name__)
        analysis["status"] = AnalysisStatus.FAILED.value
        analysis["error"] = str(exc)
    ANALYSES_TABLE.update(dict(analysis), doc_ids=[ANALYSES_TABLE.get(AnalysisQuery().id == analysis_id).doc_id])
    _cache_set(analysis_id, dict(analysis))
    return AnalysisResponse.model_validate(analysis)


@router.get("/incidents/analyze", response_model=list[AnalysisListItem], tags=["Analysis"])
def list_analyses(_user: dict = Depends(get_current_user)):
    docs = ANALYSES_TABLE.all()
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return [
        AnalysisListItem(id=d["id"], title=d.get("title", ""), status=d["status"], created_at=d["created_at"])
        for d in docs
    ]


@router.get("/incidents/analyze/{analysis_id}", response_model=AnalysisResponse, tags=["Analysis"])
def get_analysis(analysis_id: str, _user: dict = Depends(get_current_user)):
    cached = _cache_get(analysis_id)
    if cached:
        return AnalysisResponse.model_validate(cached)
    doc = ANALYSES_TABLE.get(AnalysisQuery().id == analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    _cache_set(analysis_id, doc)
    return AnalysisResponse.model_validate(doc)


@router.get("/incidents/analyze/{analysis_id}/csv", tags=["Analysis"])
def download_analysis_csv(analysis_id: str, _user: dict = Depends(get_current_user)):
    doc = ANALYSES_TABLE.get(AnalysisQuery().id == analysis_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    csv_content = doc.get("csv_summary", "")
    if not csv_content:
        raise HTTPException(status_code=404, detail="CSV summary not available for this analysis")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="analysis_{analysis_id[:8]}.csv"'},
    )
