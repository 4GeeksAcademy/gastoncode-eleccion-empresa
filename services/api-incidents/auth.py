"""
Módulo de autenticación delegada a api-auth.

Valida tokens JWT emitidos por el servicio api-auth
usando el mismo JWT_SECRET compartido.
"""

import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET no está configurado. "
        "Definilo en el entorno o en un archivo .env antes de iniciar."
    )
ALGORITHM = "HS256"
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8001").rstrip("/")
if not AUTH_SERVICE_URL:
    raise RuntimeError("AUTH_SERVICE_URL no esta configurado.")
logger = logging.getLogger("api-incidents.auth")

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{AUTH_SERVICE_URL}/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    """Valida el JWT y consulta la identidad vigente en api-auth."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
        )
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise HTTPException(
                status_code=401,
                detail="Token inválido: faltan campos obligatorios",
            )

    except JWTError as error:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado",
        ) from error

    request = Request(
        f"{AUTH_SERVICE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urlopen(request, timeout=3) as response:
            current_user = json.load(response)
    except HTTPError as error:
        if error.code == 401:
            raise HTTPException(
                status_code=401, detail="Cuenta no valida o desactivada"
            ) from error
        logger.warning("Identidad no disponible: HTTP %s", error.code)
        raise HTTPException(
            status_code=503, detail="No se pudo validar la identidad"
        ) from error
    except (URLError, TimeoutError, OSError, ValueError) as error:
        logger.warning("Servicio de identidad no disponible (%s)", type(error).__name__)
        raise HTTPException(
            status_code=503, detail="Servicio de identidad no disponible"
        ) from error

    if (
        not isinstance(current_user, dict)
        or current_user.get("id") != user_id
        or current_user.get("role") not in ("admin", "manager", "user")
    ):
        raise HTTPException(status_code=401, detail="Identidad no valida")
    return current_user


def require_roles(allowed_roles: list[str]):
    """Dependency factory: solo permite acceso a usuarios con rol específico."""
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Permiso denegado. Se requiere uno de los roles: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker