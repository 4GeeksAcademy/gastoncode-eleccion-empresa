"""Incidents models — Pydantic schemas for incidents and analysis."""

from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IncidentCategory(str, Enum):
    SAFETY = "safety"
    QUALITY = "quality"
    SERVICE = "service"
    EQUIPMENT = "equipment"
    OTHER = "other"


class IncidentStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentOrigin(str, Enum):
    CLIENT = "client"
    INTERNAL = "internal"
    SUPPLIER = "supplier"


class IncidentBranch(str, Enum):
    CHAPINERO = "chapinero"
    USAQUEN = "usaquen"
    MODELIA = "modelia"
    PORTAL_80 = "portal_80"


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
    category: str
    count: int
    branch: str


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
