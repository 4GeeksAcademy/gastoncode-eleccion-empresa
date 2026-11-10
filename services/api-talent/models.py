from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, EmailStr, Field

Stage = Literal["pending", "review", "personal_interview", "technical_interview", "offer_presented"]
Status = Literal["received", "in_progress", "selected", "discarded"]


class CandidateInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field(min_length=1, max_length=50)
    position: str = Field(min_length=1, max_length=200)
    cv_url: AnyHttpUrl
    linkedin_url: AnyHttpUrl | None = None
    experience_years: int = Field(ge=0, le=100, strict=True)


class CandidateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Status
    stage: Stage


class NoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    content: str = Field(min_length=1, max_length=5000)


class Candidate(BaseModel):
    model_config = ConfigDict(coerce_numbers_to_str=True)
    id: str
    full_name: str
    position: str
    status: Status
    stage: Stage
    experience_years: int
    applied_at: str


class CandidateDetail(Candidate):
    email: str
    phone: str
    linkedin_url: AnyHttpUrl | None = None
    cv_url: AnyHttpUrl | None = None
    updated_at: str
    notes_count: int = 0


class RecordsResponse(BaseModel):
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    limit: int = Field(ge=1, le=1000)
    data: list[Candidate]


class Note(BaseModel):
    model_config = ConfigDict(coerce_numbers_to_str=True)
    id: str
    record_id: str
    content: str
    created_at: str