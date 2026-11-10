import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException


def tracker_request(method: str, path: str, payload: dict | None = None):
    base_url = os.environ.get("TRACKER_API_URL", "https://playground.4geeks.com/tracker/api/v1").rstrip("/")
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
            return json.loads(body)
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