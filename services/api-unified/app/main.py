"""Unified API — standalone FastAPI application with all modules imported directly.

No legacy service loading. All modules live under app/modules/.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.modules.auth import auth_router, users_router, profiles_router
from app.modules.auth.auth import get_current_user, require_roles
from app.modules.suppliers import suppliers_router
from app.modules.incidents import incidents_router
from app.modules.inventory import inventory_router, create_db_and_tables
from app.modules.talent import talent_router


SERVICE_DIR = __file__  # noqa

logger = logging.getLogger("brasaland.api-unified")
load_dotenv()


# ── Exception handlers ─────────────────────────────────────


async def _handle_validation_error(_request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


async def _handle_response_validation_error(_request, exc: ResponseValidationError):
    logger.error("Response validation error (%s)", type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


async def _handle_http_exception(_request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


async def _handle_unexpected_error(_request, exc: Exception):
    logger.error("Unhandled API error (%s)", type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Lifespan ────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if not os.getenv("JWT_SECRET"):
        raise RuntimeError("JWT_SECRET no está configurado")
    create_db_and_tables()
    yield


# ── App factory ─────────────────────────────────────────────


def create_app() -> FastAPI:
    app = FastAPI(
        title="Brasaland Unified API",
        version="0.2.0",
        description="Modular API for Brasaland authentication and business domains.",
        lifespan=lifespan,
    )

    origins = [
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(ResponseValidationError, _handle_response_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected_error)

    # ── Include routers directly ──
    app.include_router(auth_router)
    app.include_router(users_router, prefix="/auth")
    app.include_router(profiles_router, prefix="/auth")
    app.include_router(suppliers_router)
    app.include_router(incidents_router)
    app.include_router(inventory_router)
    app.include_router(talent_router)

    # ── Dependency overrides ──
    # Talent requires admin/manager role. Override get_current_user in talent.
    app.dependency_overrides[get_current_user] = get_current_user

    @app.get("/", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "brasaland-unified-api"}

    @app.get("/health", tags=["health"])
    def detailed_health() -> dict[str, str]:
        return {"status": "healthy", "service": "brasaland-unified-api"}

    return app
