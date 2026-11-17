"""Auth / Users / Profiles — Pydantic response models.

All response schemas for the auth module live here to avoid circular imports
between auth.py, users.py, and profiles.py.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ── Shared profile ──────────────────────────────────────────


class ProfileResponse(BaseModel):
    """Public profile data – no sensitive fields."""
    id: str
    user_id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


# ── Auth (/auth) ────────────────────────────────────────────


class TokenResponse(BaseModel):
    """JWT token response (login). Never includes email or password."""
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    """Currently authenticated user (includes own email)."""
    id: str
    email: str
    role: str
    profile: Optional[ProfileResponse] = None


# ── Users (/users) ──────────────────────────────────────────


class UserResponse(BaseModel):
    """User record visible to admin/manager roles."""
    id: str
    email: str
    is_active: bool
    role: str
    created_at: str


class RegisterResponse(BaseModel):
    """Response after user registration."""
    user: UserResponse
    profile: ProfileResponse


class DisplayNameItem(BaseModel):
    """Minimal user representation for display-name lookups."""
    id: str
    display_name: str