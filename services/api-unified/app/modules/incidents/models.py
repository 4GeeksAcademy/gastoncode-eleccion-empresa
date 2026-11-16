"""Incidents models — Pydantic schemas for incidents and analysis."""

from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IncidentCategory(str, Enum):
    EQUIPMENT_FAILURE = "equipment_failure"
    SUPPLY_ISSUE = "supply_issue"
    CUSTOMER_COMPLAINT = "customer_complaint"
    STAFF_ISSUE = "staff_issue"
    FACILITY_ISSUE = "facility_issue"
    POS_SYSTEM = "pos_system"
    DELIVERY_ISSUE = "delivery_issue"
    OTHER = "other"


class IncidentStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISCARDED = "discarded"


class IncidentOrigin(str, Enum):
    CUSTOMER = "customer"
    BRANCH = "branch"
    INTERNAL = "internal"


class IncidentBranch(str, Enum):
    CENTRAL = "central"
    MEDELLIN_CENTRO = "medellin_centro"
    MEDELLIN_LAURELES = "medellin_laureles"
    MEDELLIN_ENVIGADO = "medellin_envigado"
    MEDELLIN_BELLO = "medellin_bello"
    MEDELLIN_ITAGUI = "medellin_itagui"
    BOGOTA_CHAPINERO = "bogota_chapinero"
    BOGOTA_USAQUEN = "bogota_usaquen"
    CALI_GRANADA = "cali_granada"
    BARRANQUILLA_NORTE = "barranquilla_norte"
    MIAMI_DORAL = "miami_doral"
    MIAMI_HIALEAH = "miami_hialeah"
    MIAMI_KENDALL = "miami_kendall"
    ORLANDO_INTERNATIONAL = "orlando_international"
    FORT_LAUDERDALE = "fort_lauderdale"


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=2000)
    category: IncidentCategory
    branch: IncidentBranch
    origin: IncidentOrigin = IncidentOrigin.INTERNAL


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    comment: Optional[str] = Field(None, max_length=500)


class Incident(BaseModel):
    id: str
    title: str
    description: str
    category: str
    branch: str
    origin: str
    status: str
    created_at: str
    updated_at: str
    created_by: str
    resolution_comment: Optional[str] = None


class IncidentSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]


# Analysis models
class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisResponse(BaseModel):
    id: str
    title: str
    status: str
    summary: Optional[str] = None
    csv_summary: Optional[str] = None
    created_at: str
    error: Optional[str] = None


class AnalysisListItem(BaseModel):
    id: str
    title: str
    status: str
    created_at: str
