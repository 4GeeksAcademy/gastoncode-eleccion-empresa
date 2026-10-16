from tinydb import Query

from database import users_table, profiles_table, reset_tokens_table


User = Query()
Profile = Query()
ResetToken = Query()


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
    users_table.insert(user)
    profiles_table.insert(profile)

    return user


def update_user(user_id: str, changes: dict):
    users_table.update(
        changes,
        User.id == user_id
    )

    return get_user_by_id(user_id)


def delete_user(user_id: str):
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


def update_profile(user_id: str, changes: dict):
    profiles_table.update(
        changes,
        Profile.user_id == user_id
    )

    return get_profile_by_user_id(user_id)


# ── Reset de contraseña ──────────────────────────────────────

def create_reset_token(token_data: dict):
    """Almacena un token de restablecimiento hasheado."""
    reset_tokens_table.insert(token_data)


def get_reset_token(token_hash: str):
    """Busca un token de restablecimiento por su hash."""
    return reset_tokens_table.get(
        ResetToken.token_hash == token_hash
    )


def mark_reset_token_used(token_hash: str):
    """Marca un token como usado para evitar reutilización."""
    reset_tokens_table.update(
        {"used": True},
        ResetToken.token_hash == token_hash
    )


def invalidate_user_reset_tokens(user_id: str):
    """Invalida todos los tokens pendientes de un usuario."""
    reset_tokens_table.update(
        {"used": True},
        (ResetToken.user_id == user_id) & (ResetToken.used == False)
    )
