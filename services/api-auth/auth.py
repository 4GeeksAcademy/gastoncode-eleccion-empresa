import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.hash import bcrypt
from pydantic import BaseModel, EmailStr

from email_service import send_reset_email
from services import (
    create_reset_token,
    get_profile_by_user_id,
    get_reset_token,
    get_user_by_email,
    get_user_by_id,
    invalidate_user_reset_tokens,
    mark_reset_token_used,
    update_user,
)


load_dotenv()


router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET no está configurado. "
        "Definilo en el entorno o en un archivo .env antes de iniciar."
    )
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def create_access_token(user_id: str, email: str, user: dict): 
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": user_id,
        "email": email,
        "role": user["role"],  
        "exp": expiration
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM
    )


def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        user = get_user_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Usuario no válido"
            )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=401,
                detail="Cuenta desactivada"
            )

        return user

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado"
        )

def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado. Se requiere uno de los siguientes roles: {', '.join(allowed_roles)}"
            )
        
        return current_user
        
    return role_checker

@router.post("/login")
def login(
    form: OAuth2PasswordRequestForm = Depends()
):
    # Swagger llama "username" al campo.
    # Nosotros usamos ese campo para enviar el email.

    user = get_user_by_email(form.username)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    if not bcrypt.verify(
        form.password,
        user["hashed_password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    token = create_access_token(
        user["id"],
        user["email"],
        user
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user)
):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": get_profile_by_user_id(
            current_user["id"]
        )
    }


# ── Modelos Pydantic ─────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Constantes de restablecimiento ────────────────────────────

RESET_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30")
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


# ── Endpoints de restablecimiento ─────────────────────────────

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    """
    Solicita un enlace de restablecimiento de contraseña.

    Siempre responde con el mismo mensaje, independientemente de
    si el email existe o no, para evitar la enumeración de usuarios.
    """
    user = get_user_by_email(data.email)

    if user:
        # 1. Generar token aleatorio seguro
        raw_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        # 2. Persistir el token hasheado
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        )
        token_data = {
            "token_hash": token_hash,
            "user_id": user["id"],
            "expires_at": expires_at.isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        create_reset_token(token_data)

        # 3. Construir enlace y enviar email
        reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
        user_name = None
        profile = get_profile_by_user_id(user["id"])
        if profile:
            user_name = profile.get("name")

        send_reset_email(
            email_to=user["email"],
            reset_url=reset_url,
            user_name=user_name,
        )

    # Respuesta genérica: misma para email existente e inexistente
    return {
        "message": (
            "Si el email existe, recibirás un enlace "
            "para restablecer tu contraseña."
        )
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    """
    Restablece la contraseña usando un token de restablecimiento.

    El token debe ser válido (no expirado, no usado). Tras usarlo
    queda invalidado para evitar su reutilización.
    """
    # Validar requisitos mínimos de la nueva contraseña
    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 8 caracteres",
        )

    # 1. Hashear el token recibido para buscar en la BD
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    stored_token = get_reset_token(token_hash)

    # 2. Validar que el token existe, no está usado y no ha expirado
    if not stored_token:
        raise HTTPException(
            status_code=400,
            detail="El enlace no es válido o ha expirado",
        )

    if stored_token.get("used", False):
        raise HTTPException(
            status_code=400,
            detail="El enlace no es válido o ha expirado",
        )

    expires_at = datetime.fromisoformat(stored_token["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="El enlace no es válido o ha expirado",
        )

    # 3. Actualizar la contraseña del usuario
    user_id = stored_token["user_id"]
    now_iso = datetime.now(timezone.utc).isoformat()

    update_user(user_id, {
        "hashed_password": bcrypt.hash(data.password),
        "password_changed_at": now_iso,
    })

    # 4. Invalidar el token (y cualquier otro token pendiente del usuario)
    mark_reset_token_used(token_hash)
    invalidate_user_reset_tokens(user_id)

    return {
        "message": "Contraseña restablecida correctamente",
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Cambia la contraseña del usuario autenticado.

    Requiere la contraseña actual para verificar la identidad.
    """
    # 1. Verificar la contraseña actual
    if not bcrypt.verify(
        data.current_password,
        current_user["hashed_password"],
    ):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual no es correcta",
        )

    # 2. Validar requisitos mínimos de la nueva contraseña
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe tener al menos 8 caracteres",
        )

    # 3. Actualizar la contraseña
    now_iso = datetime.now(timezone.utc).isoformat()
    update_user(current_user["id"], {
        "hashed_password": bcrypt.hash(data.new_password),
        "password_changed_at": now_iso,
    })

    # 4. Invalidar tokens de restablecimiento pendientes
    invalidate_user_reset_tokens(current_user["id"])

    return {
        "message": "Contraseña actualizada correctamente",
    }
