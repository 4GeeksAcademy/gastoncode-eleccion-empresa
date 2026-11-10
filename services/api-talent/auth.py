import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise HTTPException(503, "Servicio de identidad no configurado")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise HTTPException(401, "Sesion no valida")
    except JWTError as error:
        raise HTTPException(401, "Sesion no valida") from error

    auth_url = os.environ.get("AUTH_SERVICE_URL", "http://127.0.0.1:8001").rstrip("/")
    request = Request(f"{auth_url}/auth/me", headers={"Authorization": f"Bearer {token}"})
    try:
        with urlopen(request, timeout=3) as response:
            user = json.load(response)
    except HTTPError as error:
        if error.code == 401:
            raise HTTPException(401, "Cuenta no valida o desactivada") from error
        raise HTTPException(503, "No se pudo validar la identidad") from error
    except (URLError, OSError, ValueError) as error:
        raise HTTPException(503, "Servicio de identidad no disponible") from error
    if not isinstance(user, dict) or user.get("id") != user_id:
        raise HTTPException(401, "Identidad no valida")
    if user.get("role") not in ("admin", "manager"):
        raise HTTPException(403, "No tienes permiso para acceder a talento")
    return user