import logging
from threading import RLock
from datetime import datetime, timezone

from tinydb import Query

from database import users_table, profiles_table, reset_tokens_table


User = Query()
Profile = Query()
ResetToken = Query()
logger = logging.getLogger("api-auth.persistence")
_write_lock = RLock()


def get_user_by_id(user_id: str):
    return users_table.get(
        User.id == user_id
    )


def get_user_by_email(email: str):
    return users_table.get(
        User.email == email
    )


def get_all_users():
    return users_table.all()


def create_user(user: dict, profile: dict):
    """Create a user and profile, compensating if the second write fails.

    TinyDB does not provide a transaction spanning tables. This rollback
    protects against ordinary write failures, but cannot provide crash-safe or
    cross-process atomicity.
    """
    with _write_lock:
        user_doc_id = users_table.insert(user)
        try:
            profiles_table.insert(profile)
        except Exception as error:
            try:
                profiles_table.remove(Profile.id == profile["id"])
                users_table.remove(doc_ids=[user_doc_id])
            except Exception as rollback_error:
                logger.error(
                    "User creation rollback failed (error_type=%s)",
                    type(rollback_error).__name__,
                )
                raise RuntimeError("No se pudo revertir el alta incompleta") from error
            raise

    return user


def update_user(user_id: str, changes: dict):
    with _write_lock:
        users_table.update(
            changes,
            User.id == user_id
        )

    return get_user_by_id(user_id)


def delete_user(user_id: str):
    with _write_lock:
        invalidate_user_reset_tokens(user_id)
        users_table.remove(
            User.id == user_id
        )

        profiles_table.remove(
            Profile.user_id == user_id
        )


def get_profile_by_user_id(user_id: str):
    return profiles_table.get(
        Profile.user_id == user_id
    )


def get_display_names_by_user_ids(user_ids: list[str]):
    """Return only display names for the requested user IDs."""
    requested_ids = set(user_ids)
    if not requested_ids:
        return []

    profiles = profiles_table.search(Profile.user_id.one_of(list(requested_ids)))
    names_by_user_id = {
        profile["user_id"]: profile.get("name")
        for profile in profiles
        if profile.get("user_id") in requested_ids
    }
    users = users_table.search(User.id.one_of(list(requested_ids)))
    return [
        {
            "id": user["id"],
            "display_name": names_by_user_id.get(user["id"]) or "Usuario sin nombre",
        }
        for user in users
    ]


def update_profile(user_id: str, changes: dict):
    with _write_lock:
        profiles_table.update(
            changes,
            Profile.user_id == user_id
        )

    return get_profile_by_user_id(user_id)


# ── Reset de contraseña ──────────────────────────────────────

def create_reset_token(token_data: dict):
    """Almacena un token de restablecimiento hasheado."""
    with _write_lock:
        reset_tokens_table.insert(token_data)


def get_reset_token(token_hash: str):
    """Busca un token de restablecimiento por su hash."""
    return reset_tokens_table.get(
        ResetToken.token_hash == token_hash
    )


def mark_reset_token_used(token_hash: str):
    """Marca un token como usado para evitar reutilización."""
    with _write_lock:
        reset_tokens_table.update(
            {"used": True},
            ResetToken.token_hash == token_hash
        )


def invalidate_user_reset_tokens(user_id: str):
    """Invalida todos los tokens pendientes de un usuario."""
    with _write_lock:
        reset_tokens_table.update(
            {"used": True},
            (ResetToken.user_id == user_id) & (ResetToken.used == False)
        )


def update_password_and_invalidate_reset_tokens(user_id: str, changes: dict):
    """Update a password only after disabling its outstanding reset tokens.

    The order is deliberately fail-closed: if the user update fails after the
    token write, the old password remains but no reset link remains usable.
    TinyDB cannot make the two table writes atomic.
    """
    with _write_lock:
        invalidate_user_reset_tokens(user_id)
        return update_user(user_id, changes)


def reset_password_and_invalidate_reset_tokens(
    user_id: str, token_hash: str, changes: dict
):
    """Consume a still-pending reset token and update its user's password.

    The token is rechecked under the same process-local lock used for writes,
    preventing two concurrent requests in this process from consuming it.
    """
    with _write_lock:
        token = get_reset_token(token_hash)
        if (
            not token
            or token.get("user_id") != user_id
            or token.get("used") is not False
        ):
            return None
        try:
            expires_at = datetime.fromisoformat(token.get("expires_at"))
        except (TypeError, ValueError):
            return None
        if (
            expires_at.tzinfo is None
            or expires_at.utcoffset() is None
            or expires_at < datetime.now(timezone.utc)
        ):
            return None
        invalidate_user_reset_tokens(user_id)
        return update_user(user_id, changes)
