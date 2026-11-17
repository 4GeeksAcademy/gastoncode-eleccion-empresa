"""Tracker HTTP client — communicates with the external talent tracker API.

Caches GET responses in-memory with TTL (30s) and invalidates cache on
write operations (POST, PATCH, DELETE) to avoid stale data.
"""

import json
import os
from collections import OrderedDict
from threading import Lock
from time import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException


# ── In-memory cache ──────────────────────────────────────────
_TRACKER_CACHE_MAX = 200
_TRACKER_CACHE_TTL = 30  # segundos
_tracker_cache: OrderedDict[str, tuple[float, object]] = OrderedDict()
_tracker_cache_lock = Lock()


def _cache_get(key: str):
    with _tracker_cache_lock:
        if key not in _tracker_cache:
            return None
        timestamp, data = _tracker_cache[key]
        if time() - timestamp > _TRACKER_CACHE_TTL:
            del _tracker_cache[key]
            return None
        _tracker_cache.move_to_end(key)
        return data


def _cache_set(key: str, data: object):
    with _tracker_cache_lock:
        _tracker_cache[key] = (time(), data)
        _tracker_cache.move_to_end(key)
        while len(_tracker_cache) > _TRACKER_CACHE_MAX:
            _tracker_cache.popitem(last=False)


def _cache_invalidate_prefix(prefix: str):
    """Invalidar todas las entradas que comiencen con un prefijo (ej: 'records/')."""
    with _tracker_cache_lock:
        keys_to_delete = [k for k in _tracker_cache if k.startswith(prefix)]
        for k in keys_to_delete:
            del _tracker_cache[k]


def tracker_request(method: str, path: str, payload: dict | None = None):
    base_url = os.environ.get("TRACKER_API_URL", "https://playground.4geeks.com/tracker/api/v1").rstrip("/")

    # ── Cache hit (solo GET) ─────────────────────────────────
    if method == "GET":
        cached = _cache_get(path)
        if cached is not None:
            return cached

    request = Request(
        f"{base_url}/{path}",
        method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        data=json.dumps(payload).encode() if payload is not None else None,
    )
    try:
        with urlopen(request, timeout=10) as response:
            if response.status == 204:
                return None
            body = response.read(5_000_001)
            if len(body) > 5_000_000:
                raise HTTPException(502, "Respuesta del proveedor no valida")
            data = json.loads(body)

            # ── Cache successful GET responses ───────────────
            if method == "GET":
                _cache_set(path, data)

            # ── Invalidate cache on writes ───────────────────
            if method in ("POST", "PATCH", "DELETE"):
                _cache_invalidate_prefix("records")

            return data
    except HTTPError as error:
        messages = {
            400: "Revisa los datos ingresados",
            404: "No se encontro el recurso",
            409: "La solicitud entra en conflicto con los datos existentes",
            422: "Revisa los datos ingresados",
        }
        if error.code in messages:
            raise HTTPException(error.code, messages[error.code]) from error
        raise HTTPException(502, "El proveedor de talento no pudo completar la solicitud") from error
    except (URLError, OSError) as error:
        raise HTTPException(503, "Proveedor de talento no disponible") from error
    except (ValueError, UnicodeError) as error:
        raise HTTPException(502, "Respuesta del proveedor no valida") from error
