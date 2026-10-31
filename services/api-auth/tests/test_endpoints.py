import hashlib
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import ValidationError


def test_health_endpoint_returns_business_status(api):
    main = __import__("main")
    assert main.home() == {"message": "API funcionando"}


def test_register_creates_user_and_profile_with_safe_defaults(api):
    data = api["users"].UserCreate(
        email="ana@example.com", password="clave-segura-123", name="Ana"
    )
    result = api["users"].register(data)
    stored = api["services"].get_user_by_id(result["user"]["id"])

    assert result["user"]["role"] == "user"
    assert result["user"]["is_active"] is True
    assert result["profile"]["user_id"] == result["user"]["id"]
    assert stored["hashed_password"] != data.password
    assert "hashed_password" not in result["user"]


def test_register_accepts_optional_profile_fields_as_empty(api):
    result = api["users"].register(
        api["users"].UserCreate(email="minimal@example.com", password="12345678")
    )
    assert result["profile"]["name"] is None
    assert result["profile"]["phone"] is None
    assert result["profile"]["address"] is None


def test_register_rejects_duplicate_email(api, user_factory):
    user_factory()
    with pytest.raises(HTTPException) as error:
        api["users"].register(
            api["users"].UserCreate(email="ana@example.com", password="another-pass")
        )
    assert error.value.status_code == 400


def test_login_returns_token_for_valid_credentials(api, user_factory):
    user, _ = user_factory()
    form = OAuth2PasswordRequestForm(username=user["email"], password="clave-segura-123")

    result = api["auth"].login(form)
    claims = api["auth"].jwt.decode(
        result["access_token"], api["auth"].JWT_SECRET, algorithms=["HS256"]
    )
    assert result["token_type"] == "bearer"
    assert claims["sub"] == user["id"]
    assert claims["role"] == "user"


@pytest.mark.parametrize(
    "email,password,active",
    [
        ("missing@example.com", "clave-segura-123", True),
        ("ana@example.com", "incorrecta", True),
        ("ana@example.com", "clave-segura-123", False),
    ],
)
def test_login_rejects_unknown_wrong_password_or_disabled_user(api, user_factory, email, password, active):
    user_factory(active=active)
    with pytest.raises(HTTPException) as error:
        api["auth"].login(OAuth2PasswordRequestForm(username=email, password=password))
    assert error.value.status_code == 401


def test_get_me_returns_current_public_user_and_profile(api, user_factory):
    user, profile = user_factory()
    result = api["auth"].get_me(user)
    assert result == {"id": user["id"], "email": user["email"], "role": "user", "profile": profile}


def test_get_me_handles_missing_profile(api, user_factory):
    user, _ = user_factory(profile=False)
    assert api["auth"].get_me(user)["profile"] is None


def test_get_current_user_rejects_invalid_missing_and_disabled_accounts(api, user_factory):
    user, _ = user_factory()
    invalid_token = "not-a-jwt"
    with pytest.raises(HTTPException) as invalid:
        api["auth"].get_current_user(invalid_token)
    assert invalid.value.status_code == 401

    token_for_missing_user = api["auth"].jwt.encode(
        {"sub": "missing-user"}, api["auth"].JWT_SECRET, algorithm="HS256"
    )
    with pytest.raises(HTTPException) as missing:
        api["auth"].get_current_user(token_for_missing_user)
    assert missing.value.status_code == 401

    token = api["auth"].create_access_token(user["id"], user["email"], user)
    api["services"].update_user(user["id"], {"is_active": False})
    with pytest.raises(HTTPException) as disabled:
        api["auth"].get_current_user(token)
    assert disabled.value.status_code == 401


def test_get_profile_returns_current_profile(api, user_factory):
    user, profile = user_factory()
    assert api["profiles"].get_my_profile(user) == profile


def test_get_profile_fails_when_profile_is_absent(api, user_factory):
    user, _ = user_factory(profile=False)
    with pytest.raises(HTTPException) as error:
        api["profiles"].get_my_profile(user)
    assert error.value.status_code == 404


def test_update_profile_changes_only_provided_fields(api, user_factory):
    user, original = user_factory()
    result = api["profiles"].edit_my_profile(
        api["profiles"].ProfileUpdate(name="Ana María"), user
    )
    assert result["name"] == "Ana María"
    assert result["phone"] == original["phone"]
    assert result["address"] == original["address"]


def test_update_profile_handles_empty_patch_and_missing_profile(api, user_factory):
    user, original = user_factory()
    unchanged = api["profiles"].edit_my_profile(api["profiles"].ProfileUpdate(), user)
    assert unchanged == original

    api["database"].profiles_table.truncate()
    with pytest.raises(HTTPException) as error:
        api["profiles"].edit_my_profile(api["profiles"].ProfileUpdate(name="Updated"), user)
    assert error.value.status_code == 404


def test_list_users_allows_manager_and_hides_password_hash(api, user_factory):
    manager, _ = user_factory(role="manager")
    user_factory(email="otra@example.com")
    result = api["users"].list_users(manager)
    assert len(result) == 2
    assert all("hashed_password" not in item for item in result)


def test_list_users_returns_empty_list_when_database_has_no_users(api, user_factory):
    manager, _ = user_factory(role="manager")
    api["database"].users_table.truncate()

    assert api["users"].list_users(manager) == []


def test_display_names_resolves_only_requested_users_with_safe_fallbacks(api, user_factory):
    first, _ = user_factory(email="first@example.com")
    second, _ = user_factory(email="second@example.com", profile=False)
    ignored, _ = user_factory(email="ignored@example.com")

    result = api["users"].display_names(
        api["users"].DisplayNamesRequest(ids=[first["id"], second["id"]]),
        {"id": ignored["id"], "role": "user"},
    )

    assert result == [
        {"id": first["id"], "display_name": "Ana Test"},
        {"id": second["id"], "display_name": "Usuario sin nombre"},
    ]
    assert all(set(item) == {"id", "display_name"} for item in result)
    assert "@" not in " ".join(item["display_name"] for item in result)


def test_display_names_rejects_empty_and_oversized_batches(api):
    with pytest.raises(ValidationError):
        api["users"].DisplayNamesRequest(ids=[])
    with pytest.raises(ValidationError):
        api["users"].DisplayNamesRequest(ids=[str(index) for index in range(501)])


def test_list_users_rejects_non_privileged_role(api, user_factory):
    user, _ = user_factory(role="user")
    with pytest.raises(HTTPException) as error:
        api["auth"].require_roles(["admin", "manager"])(user)
    assert error.value.status_code == 403


def test_get_user_allows_owner_and_admin(api, user_factory):
    owner, _ = user_factory()
    other, _ = user_factory(email="other@example.com")
    admin = {**other, "role": "admin"}

    assert api["users"].get_user(owner["id"], owner)["id"] == owner["id"]
    assert api["users"].get_user(owner["id"], admin)["id"] == owner["id"]


def test_get_user_forbidden_non_owner_and_missing_user(api, user_factory):
    owner, _ = user_factory()
    other, _ = user_factory(email="other@example.com")
    with pytest.raises(HTTPException) as forbidden:
        api["users"].get_user(owner["id"], other)
    assert forbidden.value.status_code == 403

    with pytest.raises(HTTPException) as missing:
        api["users"].get_user("unknown-id", {**owner, "role": "admin"})
    assert missing.value.status_code == 404


def test_update_user_owner_can_edit_email_and_password(api, user_factory):
    user, _ = user_factory()
    result = api["users"].edit_user(
        user["id"], api["users"].UserUpdate(email="new@example.com", password="nueva-clave-123"), user
    )
    stored = api["services"].get_user_by_id(user["id"])
    assert result["email"] == "new@example.com"
    assert api["users"].bcrypt.verify("nueva-clave-123", stored["hashed_password"])
    assert "hashed_password" not in result


def test_update_user_rejects_duplicate_email_and_non_admin_role_changes(api, user_factory):
    first, _ = user_factory()
    second, _ = user_factory(email="other@example.com")
    with pytest.raises(HTTPException) as duplicate:
        api["users"].edit_user(first["id"], api["users"].UserUpdate(email=second["email"]), first)
    assert duplicate.value.status_code == 400

    with pytest.raises(HTTPException) as role:
        api["users"].edit_user(first["id"], api["users"].UserUpdate(role="manager"), first)
    assert role.value.status_code == 403
    with pytest.raises(HTTPException) as active:
        api["users"].edit_user(first["id"], api["users"].UserUpdate(is_active=False), first)
    assert active.value.status_code == 403


def test_update_user_admin_changes_role_status_and_empty_update_is_noop(api, user_factory):
    user, _ = user_factory()
    admin = {**user, "role": "admin"}
    changed = api["users"].edit_user(
        user["id"], api["users"].UserUpdate(role="manager", is_active=False), admin
    )
    assert changed["role"] == "manager"
    assert changed["is_active"] is False

    unchanged = api["users"].edit_user(user["id"], api["users"].UserUpdate(), admin)
    assert unchanged["role"] == "manager"


def test_delete_user_removes_user_profile_and_invalidates_reset_tokens(api, user_factory):
    user, _ = user_factory()
    api["services"].create_reset_token({
        "token_hash": "pending", "user_id": user["id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), "used": False,
    })
    result = api["users"].remove_user(user["id"], user)
    assert result == {"message": "Usuario eliminado"}
    assert api["services"].get_user_by_id(user["id"]) is None
    assert api["services"].get_profile_by_user_id(user["id"]) is None
    assert api["services"].get_reset_token("pending")["used"] is True


def test_delete_user_rejects_non_owner_and_missing_id(api, user_factory):
    user, _ = user_factory()
    other, _ = user_factory(email="other@example.com")
    with pytest.raises(HTTPException) as forbidden:
        api["users"].remove_user(user["id"], other)
    assert forbidden.value.status_code == 403

    with pytest.raises(HTTPException) as missing:
        api["users"].remove_user("unknown-id", {**user, "role": "admin"})
    assert missing.value.status_code == 404


def test_forgot_password_is_generic_for_existing_and_unknown_email(api, user_factory, monkeypatch):
    user_factory()
    sent = []
    monkeypatch.setattr(api["auth"], "send_reset_email", lambda **kwargs: sent.append(kwargs) or True)
    known = api["auth"].forgot_password(api["auth"].ForgotPasswordRequest(email="ana@example.com"))
    unknown = api["auth"].forgot_password(api["auth"].ForgotPasswordRequest(email="missing@example.com"))
    assert known == unknown
    assert len(sent) == 1
    token = parse_qs(urlparse(sent[0]["reset_url"]).query)["token"][0]
    stored_hash = api["database"].reset_tokens_table.all()[0]["token_hash"]
    assert stored_hash == hashlib.sha256(token.encode()).hexdigest()
    assert token not in stored_hash


def test_forgot_password_handles_email_delivery_failure_without_leaking_account(api, user_factory, monkeypatch, caplog):
    user_factory()
    monkeypatch.setattr(api["auth"], "send_reset_email", lambda **kwargs: False)
    response = api["auth"].forgot_password(api["auth"].ForgotPasswordRequest(email="ana@example.com"))
    assert "ana@example.com" not in caplog.text
    assert "Si el email existe" in response["message"]


def test_reset_password_changes_hash_and_invalidates_token(api, user_factory):
    user, _ = user_factory()
    raw_token = "single-use-reset-token"
    expires = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    api["services"].create_reset_token({
        "token_hash": hashlib.sha256(raw_token.encode()).hexdigest(),
        "user_id": user["id"], "expires_at": expires, "used": False,
    })

    result = api["auth"].reset_password(api["auth"].ResetPasswordRequest(token=raw_token, password="nueva-clave-123"))
    stored_user = api["services"].get_user_by_id(user["id"])
    assert result["message"] == "Contraseña restablecida correctamente"
    assert api["auth"].bcrypt.verify("nueva-clave-123", stored_user["hashed_password"])
    assert api["database"].reset_tokens_table.all()[0]["used"] is True


def test_reset_password_rejects_short_expired_used_or_unknown_token(api, user_factory):
    user, _ = user_factory()
    with pytest.raises(HTTPException) as short:
        api["auth"].reset_password(api["auth"].ResetPasswordRequest(token="missing", password="short"))
    assert short.value.status_code == 400

    for token, expiry, used in [
        ("expired", datetime.now(timezone.utc) - timedelta(seconds=1), False),
        ("used", datetime.now(timezone.utc) + timedelta(minutes=1), True),
    ]:
        api["services"].create_reset_token({
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "user_id": user["id"], "expires_at": expiry.isoformat(), "used": used,
        })
        with pytest.raises(HTTPException) as invalid:
            api["auth"].reset_password(api["auth"].ResetPasswordRequest(token=token, password="long-password"))
        assert invalid.value.status_code == 400

    with pytest.raises(HTTPException) as unknown:
        api["auth"].reset_password(api["auth"].ResetPasswordRequest(token="unknown", password="long-password"))
    assert unknown.value.status_code == 400


def test_change_password_updates_hash_and_invalidates_pending_reset_tokens(api, user_factory):
    user, _ = user_factory()
    api["services"].create_reset_token({
        "token_hash": "pending", "user_id": user["id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), "used": False,
    })
    result = api["auth"].change_password(
        api["auth"].ChangePasswordRequest(current_password="clave-segura-123", new_password="nueva-clave-123"),
        user,
    )
    stored = api["services"].get_user_by_id(user["id"])
    assert result["message"] == "Contraseña actualizada correctamente"
    assert api["auth"].bcrypt.verify("nueva-clave-123", stored["hashed_password"])
    assert api["services"].get_reset_token("pending")["used"] is True


def test_change_password_rejects_bad_current_password_short_new_password_and_missing_user(api, user_factory, monkeypatch):
    user, _ = user_factory()
    with pytest.raises(HTTPException) as wrong:
        api["auth"].change_password(
            api["auth"].ChangePasswordRequest(current_password="incorrecta", new_password="nueva-clave-123"), user
        )
    assert wrong.value.status_code == 400

    with pytest.raises(HTTPException) as short:
        api["auth"].change_password(
            api["auth"].ChangePasswordRequest(current_password="clave-segura-123", new_password="short"), user
        )
    assert short.value.status_code == 400

    monkeypatch.setattr(api["auth"], "update_password_and_invalidate_reset_tokens", lambda user_id, changes: None)
    with pytest.raises(HTTPException) as missing:
        api["auth"].change_password(
            api["auth"].ChangePasswordRequest(current_password="clave-segura-123", new_password="nueva-clave-123"), user
        )
    assert missing.value.status_code == 404


def test_user_creation_rolls_back_if_profile_write_fails(api, monkeypatch):
    from datetime import datetime, timezone

    user = {"id": "rollback-user", "email": "rollback@example.com", "created_at": datetime.now(timezone.utc).isoformat()}
    profile = {"id": "rollback-profile", "user_id": user["id"]}
    monkeypatch.setattr(api["database"].profiles_table, "insert", Mock(side_effect=OSError("disk unavailable")))
    with pytest.raises(OSError):
        api["services"].create_user(user, profile)
    assert api["database"].users_table.all() == []
    assert api["database"].profiles_table.all() == []
