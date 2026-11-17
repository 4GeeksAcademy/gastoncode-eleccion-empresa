"""Common Pydantic schemas shared across all modules."""

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Generic message response for write operations."""
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str