"""Authentication module — JWT handling, token creation, login, password reset."""

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

from app.modules.auth.email_service import send_reset_email
from app.modules.auth.schemas import (
    MeResponse,
    ProfileResponse,
    TokenResponse,
)
from app.modules.auth.services import (
    create_reset_token,
    get_profile_by_user_id,
    get_reset_token,
    get_user_by_email,
    get_user_by_id,
    update_user,
    update_password_and_invalidate_reset_tokens,
)
from app.modules.schemas import MessageResponse


load_dotenv()
logger = logging.getLogger("api-unified.auth")


router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET no está configurado. Definilo en .env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(user_id: str, email: str, user: dict):
    expiration = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "role": user["role"], "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    user_id = payload.get("sub") if isinstance(payload, dict) else None
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no válido")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Cuenta desactivada")
    return user


def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado. Se requiere: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker


# ── Endpoints ───────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form.username)
    if not user:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    if not bcrypt.checkpw(form.password.encode("utf-8"), user["hashed_password"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    token = create_access_token(user["id"], user["email"], user)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=MeResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    profile = get_profile_by_user_id(current_user["id"])
    return MeResponse(
        id=current_user["id"],
        email=current_user["email"],
        role=current_user["role"],
        profile=ProfileResponse(**profile) if profile else None,
    )


# ── Modelos Pydantic ─────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3007").rstrip("/")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest):
    user = get_user_by_email(data.email)
    if user:
        raw_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "token_hash": token_hash,
            "user_id": user["id"],
            "expires_at": expires_at.isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        create_reset_token(token_data)
        reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
        user_name = None
        profile = get_profile_by_user_id(user["id"])
        if profile:
            user_name = profile.get("name")
        email_sent = send_reset_email(email_to=user["email"], reset_url=reset_url, user_name=user_name)
        if not email_sent:
            logger.warning("Password reset notification could not be delivered")
    return {"message": "Si el email existe, recibirás un enlace para restablecer tu contraseña."}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest):
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    stored_token = get_reset_token(token_hash)
    if not stored_token:
        raise HTTPException(status_code=400, detail="El enlace no es válido o ha expirado")
    if stored_token.get("used", False):
        raise HTTPException(status_code=400, detail="El enlace no es válido o ha expirado")
    expires_at_value = stored_token.get("expires_at")
    user_id = stored_token.get("user_id")
    try:
        expires_at = datetime.fromisoformat(expires_at_value)
    except (TypeError, ValueError):
        expires_at = None
    if (
        stored_token.get("used") is not False
        or not isinstance(user_id, str)
        or not user_id
        or expires_at is None
        or expires_at.tzinfo is None
        or expires_at.utcoffset() is None
        or expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="El enlace no es válido o ha expirado")
    user = get_user_by_id(user_id)
    if not user or not user.get("is_active", True):
        update_password_and_invalidate_reset_tokens(user_id, {})
        raise HTTPException(status_code=400, detail="El enlace no es válido o ha expirado")
    now_iso = datetime.now(timezone.utc).isoformat()
    updated_user = update_password_and_invalidate_reset_tokens(user_id, {
        "hashed_password": bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "password_changed_at": now_iso,
    })
    if updated_user is None:
        raise HTTPException(status_code=400, detail="El enlace no es válido o ha expirado")
    return {"message": "Contraseña restablecida correctamente"}


@router.post("/change-password", response_model=MessageResponse)
def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if not bcrypt.checkpw(data.current_password.encode("utf-8"), current_user["hashed_password"].encode("utf-8")):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")
    now_iso = datetime.now(timezone.utc).isoformat()
    updated_user = update_password_and_invalidate_reset_tokens(current_user["id"], {
        "hashed_password": bcrypt.hashpw(data.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "password_changed_at": now_iso,
    })
    if updated_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Contraseña actualizada correctamente"}
