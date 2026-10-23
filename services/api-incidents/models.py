from datetime import datetime, timezone
from typing import Literal, Self
from uuid import uuid4

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    UUID4,
    field_validator,
    model_validator,
)


IncidentCategory = Literal[
    "equipment_failure",
    "supply_issue",
    "customer_complaint",
    "staff_issue",
    "facility_issue",
    "pos_system",
    "delivery_issue",
    "other",
]
IncidentStatus = Literal["open", "in_progress", "resolved", "discarded"]
IncidentOrigin = Literal["customer", "branch", "internal"]
IncidentBranch = Literal[
    "central",
    "medellin_centro",
    "medellin_laureles",
    "medellin_envigado",
    "medellin_bello",
    "medellin_itagui",
    "bogota_chapinero",
    "bogota_usaquen",
    "cali_granada",
    "barranquilla_norte",
    "miami_doral",
    "miami_hialeah",
    "miami_kendall",
    "orlando_international",
    "fort_lauderdale",
]


class IncidentSummary(BaseModel):
    total: int
    by_status: dict[IncidentStatus, int]
    by_category: dict[IncidentCategory, int]
    by_origin: dict[IncidentOrigin, int]
    by_branch: dict[IncidentBranch, int]


class IncidentStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: IncidentStatus


class IncidentCreate(BaseModel):
    """Datos que puede enviar un cliente al registrar una incidencia."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: IncidentCategory
    origin: IncidentOrigin
    branch: IncidentBranch


class Incident(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: UUID4 = Field(default_factory=uuid4)
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: IncidentCategory
    status: IncidentStatus = "open"
    origin: IncidentOrigin
    branch: IncidentBranch = "central"
    created_at: AwareDatetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: AwareDatetime = Field(
        default_factory=lambda data: data["created_at"]
    )

    @field_validator("title", "description")
    @classmethod
    def validate_non_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("El texto no puede estar vacio ni contener solo espacios.")
        return value

    @field_validator("created_at", "updated_at")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_integrity(self) -> Self:
        if self.origin == "branch" and self.branch == "central":
            raise ValueError("El origen branch requiere una sede especifica.")
        if self.updated_at < self.created_at:
            raise ValueError("updated_at no puede ser anterior a created_at.")
        return self

    def update(self, **changes: object) -> Self:
        """Devuelve una copia validada; conserva el identificador y la fecha de alta."""
        editable_fields = {
            "title", "description", "category", "status", "origin", "branch"
        }
        if changes.keys() - editable_fields:
            raise ValueError(
                "Solo se pueden actualizar title, description, category, status, origin y branch."
            )

        updated = type(self).model_validate({
            **self.model_dump(),
            **changes,
            "updated_at": datetime.now(timezone.utc),
        })
        transitions: dict[IncidentStatus, set[IncidentStatus]] = {
            "open": {"in_progress", "discarded"},
            "in_progress": {"resolved", "discarded"},
            "resolved": set(),
            "discarded": set(),
        }
        if updated.status != self.status and updated.status not in transitions[self.status]:
            raise ValueError(
                f"Transicion de estado no permitida: {self.status} -> {updated.status}."
            )
        return updated
