import importlib.util
import sys
from pathlib import Path

import pytest


def load_promote_admin():
    spec = importlib.util.spec_from_file_location(
        "promote_admin_test", Path(__file__).resolve().parents[1] / "promote_admin.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_promoting_inactive_account_requires_explicit_activation(api, user_factory, monkeypatch):
    user, _ = user_factory(active=False)
    module = load_promote_admin()
    monkeypatch.setattr(sys, "argv", ["promote_admin.py", user["email"]])

    with pytest.raises(SystemExit) as error:
        module.main()
    assert error.value.code == 2
    assert api["services"].get_user_by_id(user["id"])["is_active"] is False


def test_promoting_inactive_account_with_activation(api, user_factory, monkeypatch):
    user, _ = user_factory(active=False)
    module = load_promote_admin()
    monkeypatch.setattr(sys, "argv", ["promote_admin.py", "--activate", user["email"]])

    module.main()
    updated = api["services"].get_user_by_id(user["id"])
    assert updated["is_active"] is True
    assert updated["role"] == "admin"
