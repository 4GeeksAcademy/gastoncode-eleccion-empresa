"""Auth services — data access layer for users, profiles, and reset tokens."""

import logging
from threading import RLock

from tinydb import Query

from app.modules.auth.database import users_table, profiles_table, reset_tokens_table


User = Query()
Profile = Query()
ResetToken = Query()
logger = logging.getLogger("api-unified.auth.persistence")
_write_lock = RLock()


def get_user_by_id(user_id: str):
    return users_table.get(User.id == user_id)


def get_user_by_email(email: str):
    return users_table.get(User.email == email)


def get_all_users():
    return users_table.all()


def create_user(user: dict, profile: dict):
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
        users_table.update(changes, User.id == user_id)
    return get_user_by_id(user_id)


def delete_user(user_id: str):
    with _write_lock:
        invalidate_user_reset_tokens(user_id)
        users_table.remove(User.id == user_id)
        profiles_table.remove(Profile.user_id == user_id)


def get_profile_by_user_id(user_id: str):
    return profiles_table.get(Profile.user_id == user_id)


def get_display_names_by_user_ids(user_ids: list[str]):
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
        profiles_table.update(changes, Profile.user_id == user_id)
    return get_profile_by_user_id(user_id)


# ── Reset de contraseña ──────────────────────────────────────

def create_reset_token(token_data: dict):
    with _write_lock:
        reset_tokens_table.insert(token_data)


def get_reset_token(token_hash: str):
    return reset_tokens_table.get(ResetToken.token_hash == token_hash)


def invalidate_user_reset_tokens(user_id: str):
    """Mark all active reset tokens for a user as used."""
    tokens = reset_tokens_table.search(
        (ResetToken.user_id == user_id) & (ResetToken.used == False)
    )
    for token in tokens:
        reset_tokens_table.update({"used": True}, doc_ids=[token.doc_id])


def update_password_and_invalidate_reset_tokens(user_id: str, changes: dict):
    with _write_lock:
        invalidate_user_reset_tokens(user_id)
        if not changes:
            return {}
        users_table.update(changes, User.id == user_id)
    return get_user_by_id(user_id)
