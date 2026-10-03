"""
Módulo de autenticación delegada a api-auth.

Valida tokens JWT emitidos por el servicio api-auth
usando el mismo JWT_SECRET compartido.
"""

import os
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

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="http://localhost:8000/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    """Valida el token JWT y retorna el usuario autenticado.

    El token debió haber sido emitido por api-auth (POST /auth/login).
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
        )
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")

        if not user_id or not role:
            raise HTTPException(
                status_code=401,
                detail="Token inválido: faltan campos obligatorios",
            )

        return {
            "id": user_id,
            "email": email,
            "role": role,
        }

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado",
        )


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