from __future__ import annotations

import importlib.util
import inspect
import logging
import os
import sys
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


SERVICE_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = SERVICE_DIR.parents[1]
logger = logging.getLogger("brasaland.api-unified")
load_dotenv(SERVICE_DIR / ".env")
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

# The legacy modules use top-level imports. Load each service with its own
# directory first on sys.path and isolate those names to prevent collisions.
_LEGACY_MODULE_NAMES = {
    "main", "auth", "users", "profiles", "services", "database", "email_service",
    "models", "schemas", "tracker", "routers", "promote_admin", "seed", "config",
}
_LEGACY_PACKAGE_NAMES = {"routers", "services"}
_LEGACY_IMPORT_LOCK = threading.RLock()


def _load_legacy_app(service_name: str):
    service_dir = REPOSITORY_ROOT / "services" / service_name
    module_name = f"brasaland_api_{service_name.removeprefix('api-')}_main"
    package = ModuleType(module_name)
    package.__path__ = [str(service_dir)]
    package.__package__ = module_name
    added_path = False
    previous_path_env = None
    path_env_changed = False
    legacy_module_snapshot = {}
    preexisting_private_names = set()
    original_package = None
    package_was_present = False
    module = None
    domain = None
    loaded_modules = {}
    try:
        with _LEGACY_IMPORT_LOCK:
            package_was_present = module_name in sys.modules
            original_package = sys.modules.get(module_name)
            preexisting_private_names = {
                name for name in sys.modules
                if name == module_name or name.startswith(f"{module_name}.")
            }
            legacy_module_snapshot = {
                name: loaded for name, loaded in sys.modules.items()
                if name in _LEGACY_MODULE_NAMES
                or name.split(".", 1)[0] in _LEGACY_MODULE_NAMES
            }
            # APIs use implicit package imports (for example,
            # `from routers.inventory import router`). Give each backend a
            # private package namespace and rewrite only its internal absolute
            # imports while loading. The original source files remain intact.
            for name in legacy_module_snapshot:
                sys.modules.pop(name, None)
            sys.modules[module_name] = package
            sys.path.insert(0, str(service_dir))
            added_path = True
            path_entry = str(service_dir)
            for package_name in _LEGACY_PACKAGE_NAMES:
                package_dir = service_dir / package_name
                if not package_dir.is_dir():
                    continue
                package_module_name = f"{module_name}.{package_name}"
                package_module = ModuleType(package_module_name)
                package_module.__path__ = [str(package_dir)]
                package_module.__package__ = package_module_name
                sys.modules[package_module_name] = package_module
                setattr(package, package_name, package_module)
                for child in package_dir.glob("*.py"):
                    if child.name == "__init__.py":
                        continue
                    child_name = f"{package_module_name}.{child.stem}"
                    child_spec = importlib.util.spec_from_file_location(child_name, child)
                    if child_spec is None or child_spec.loader is None:
                        continue
                    child_module = importlib.util.module_from_spec(child_spec)
                    sys.modules[child_name] = child_module
                    child_spec.loader.exec_module(child_module)
            previous_path_env = os.environ.get("PYTHONPATH")
            try:
                path_env_changed = True
                os.environ["PYTHONPATH"] = os.pathsep.join(
                    path for path in (str(REPOSITORY_ROOT), previous_path_env) if path
                )
                spec = importlib.util.spec_from_file_location(
                    f"{module_name}.main", service_dir / "main.py"
                )
                if spec is None or spec.loader is None:
                    raise ImportError(f"No se pudo cargar {service_dir / 'main.py'}")
                module = importlib.util.module_from_spec(spec)
                sys.modules[spec.name] = module
                source = (service_dir / "main.py").read_text(encoding="utf-8")
                for package_name in _LEGACY_PACKAGE_NAMES:
                    source = source.replace(
                        f"from {package_name}.",
                        f"from {module_name}.{package_name}.",
                    )
                    source = source.replace(
                        f"import {package_name}.",
                        f"import {module_name}.{package_name}.",
                    )
                code = compile(source, str(service_dir / "main.py"), "exec")
                exec(code, module.__dict__)
                for name, loaded in tuple(sys.modules.items()):
                    if name in _LEGACY_MODULE_NAMES:
                        loaded_modules[name] = loaded
                    elif name.split(".", 1)[0] in _LEGACY_MODULE_NAMES:
                        loaded_modules.setdefault(name.rsplit(".", 1)[-1], loaded)
                    elif name.startswith(f"{module_name}."):
                        loaded_modules.setdefault(
                            name.removeprefix(f"{module_name}."), loaded
                        )
                loaded_modules["main"] = module
                loaded_modules[module_name] = package
                loaded_modules[spec.name] = module
                domain = SimpleNamespace(app=module.app, modules=loaded_modules)
            finally:
                if path_env_changed:
                    if previous_path_env is None:
                        os.environ.pop("PYTHONPATH", None)
                    else:
                        os.environ["PYTHONPATH"] = previous_path_env
                for name in tuple(sys.modules):
                    if (
                        name in _LEGACY_MODULE_NAMES
                        or name.split(".", 1)[0] in _LEGACY_MODULE_NAMES
                        or (
                            name.startswith(f"{module_name}.")
                            and name not in preexisting_private_names
                        )
                    ):
                        sys.modules.pop(name, None)
                for name, module_obj in legacy_module_snapshot.items():
                    sys.modules[name] = module_obj
                if package_was_present:
                    sys.modules[module_name] = original_package
                else:
                    sys.modules.pop(module_name, None)
                if added_path:
                    try:
                        sys.path.remove(path_entry)
                    except ValueError:
                        pass
            if domain is None:
                raise ImportError(f"El servicio {service_name} no expone una aplicación FastAPI")
            return domain
    except Exception:
        for name in tuple(sys.modules):
            if (
                name in _LEGACY_MODULE_NAMES
                or name.split(".", 1)[0] in _LEGACY_MODULE_NAMES
            ) and name not in legacy_module_snapshot:
                sys.modules.pop(name, None)
            elif (
                name.startswith(f"{module_name}.")
                and name not in preexisting_private_names
            ):
                sys.modules.pop(name, None)
        for name, module_obj in legacy_module_snapshot.items():
            sys.modules[name] = module_obj
        if package_was_present:
            sys.modules[module_name] = original_package
        else:
            sys.modules.pop(module_name, None)
        if added_path:
            try:
                sys.path.remove(path_entry)
            except ValueError:
                pass
        if path_env_changed:
            if previous_path_env is None:
                os.environ.pop("PYTHONPATH", None)
            else:
                os.environ["PYTHONPATH"] = previous_path_env
        raise


# Keep domain-specific routers and storage objects bound to their source
# modules. The existing applications remain untouched and runnable separately.
_DOMAIN_APPS = [
    "api-auth",
    "api-suppliers",
    "api-incidents",
    "api-inventory",
    "api-talent",
]
_DOMAIN_APPS = [_load_legacy_app(service_name) for service_name in _DOMAIN_APPS]


def _legacy_domain_for_path(path: str):
    auth_domain, suppliers_domain, incidents_domain, inventory_domain, talent_domain = _DOMAIN_APPS
    if path.startswith("/suppliers"):
        return suppliers_domain.app
    elif path.startswith("/api/incidents"):
        return incidents_domain.app
    elif path.startswith("/inventory"):
        return inventory_domain.app
    elif path.startswith("/talent"):
        return talent_domain.app
    return auth_domain.app


def _legacy_exception_handler(domain, exception_type: type):
    for registered_type, handler in reversed(tuple(domain.exception_handlers.items())):
        if isinstance(registered_type, type) and issubclass(exception_type, registered_type):
            if registered_type is Exception:
                continue
            return handler
    return None


async def _call_handler(handler, request: Request, exc: Exception):
    result = handler(request, exc)
    return await result if inspect.isawaitable(result) else result


async def _handle_validation_error(request: Request, exc: RequestValidationError):
    domain = _legacy_domain_for_path(request.url.path)
    handler = _legacy_exception_handler(domain, RequestValidationError)
    if handler is not None:
        return await _call_handler(handler, request, exc)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


async def _handle_response_validation_error(request: Request, exc: ResponseValidationError):
    domain = _legacy_domain_for_path(request.url.path)
    handler = _legacy_exception_handler(domain, ResponseValidationError)
    if handler is not None:
        return await _call_handler(handler, request, exc)
    return await _handle_unexpected_error(request, exc)


async def _handle_unexpected_error(_request: Request, exc: Exception):
    # Do not log exception text or request values, which may contain sensitive data.
    logger.error("Unhandled API error (%s)", type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


async def _handle_http_exception(_request: Request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


async def _handle_domain_http_exception(request: Request, exc):
    domain = _legacy_domain_for_path(request.url.path)
    handler = _legacy_exception_handler(domain, type(exc))
    if handler is not None:
        return await _call_handler(handler, request, exc)
    return await _handle_http_exception(request, exc)


async def _handle_auth_exception(request: Request, exc: Exception):
    if isinstance(exc, (StarletteHTTPException, _DOMAIN_APPS[0].modules["auth"].HTTPException)):
        return await _handle_domain_http_exception(request, exc)
    return await _handle_unexpected_error(request, exc)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if not os.getenv("JWT_SECRET"):
        raise RuntimeError("JWT_SECRET no está configurado")
    # Use the existing inventory database configuration and startup behavior.
    _DOMAIN_APPS[3].modules["database"].create_db_and_tables()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Brasaland Unified API",
        version="0.1.0",
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
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(ResponseValidationError, _handle_response_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_domain_http_exception)
    auth_domain, suppliers_domain, incidents_domain, inventory_domain, talent_domain = _DOMAIN_APPS
    app.add_exception_handler(
        auth_domain.modules["auth"].JWTError,
        _handle_auth_exception,
    )
    app.add_exception_handler(Exception, _handle_unexpected_error)

    # Include legacy routers on the unified app. Recent FastAPI versions may
    # defer route materialization until startup; TestClient must be entered
    # before route behavior is inspected. Domain-specific health/docs routes
    # are not included.
    for domain_ref in _DOMAIN_APPS:
        domain = domain_ref.app
        for route in domain.router.routes:
            if type(route).__name__ == "_IncludedRouter":
                app.include_router(
                    route.original_router,
                    dependencies=route.include_context.dependencies,
                    prefix=route.include_context.prefix,
                    tags=route.include_context.tags,
                    responses=route.include_context.responses,
                    deprecated=route.include_context.deprecated,
                    include_in_schema=route.include_context.include_in_schema,
                    generate_unique_id_function=(
                        route.include_context.generate_unique_id_function
                    ),
                )
            elif getattr(route, "path", None) not in {
                "/", "/health", "/docs", "/redoc", "/openapi.json",
                "/docs/oauth2-redirect",
            }:
                app.router.routes.append(route)

    # Replace the old internal HTTP calls to auth with live in-process checks.
    # Keep talent's strict admin/manager boundary from its standalone service.
    auth_module = auth_domain.modules["auth"]
    current_user = auth_module.get_current_user
    for domain in (suppliers_domain, incidents_domain, inventory_domain):
        domain_auth = domain.modules.get("auth")
        if domain_auth is not None:
            app.dependency_overrides[domain_auth.get_current_user] = current_user
            # Deferred router inclusion may retain the source FastAPI app as
            # dependency_overrides_provider, depending on the FastAPI version.
            domain.app.dependency_overrides[domain_auth.get_current_user] = current_user
    app.dependency_overrides[talent_domain.modules["auth"].get_current_user] = (
        auth_module.require_roles(["admin", "manager"])
    )
    talent_domain.app.dependency_overrides[
        talent_domain.modules["auth"].get_current_user
    ] = auth_module.require_roles(["admin", "manager"])

    @app.get("/", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "brasaland-unified-api"}

    @app.get("/health", tags=["health"])
    def detailed_health() -> dict[str, str]:
        return {"status": "healthy", "service": "brasaland-unified-api"}

    return app


app = create_app()
