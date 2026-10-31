import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt


load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET no está configurado")
ALGORITHM = "HS256"
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8001").rstrip("/")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{AUTH_SERVICE_URL}/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token no contiene credenciales válidas")

    request = Request(
        f"{AUTH_SERVICE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urlopen(request, timeout=3) as response:
            user = json.load(response)
    except HTTPError as error:
        if error.code == 401:
            raise HTTPException(status_code=401, detail="Cuenta no válida o desactivada") from error
        raise HTTPException(status_code=503, detail="No se pudo validar la identidad") from error
    except (URLError, TimeoutError, OSError, ValueError) as error:
        raise HTTPException(status_code=503, detail="Servicio de identidad no disponible") from error

    if not isinstance(user, dict) or user.get("id") != user_id or not user.get("role"):
        raise HTTPException(status_code=401, detail="Identidad no válida")
    return user


def require_roles(allowed_roles: list[str]):
    def check_role(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="No posees los permisos necesarios")
        return current_user

    return check_role
