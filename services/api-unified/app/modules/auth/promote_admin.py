"""Promote an existing user to admin role (standalone script)."""

import argparse
import sys
from pathlib import Path

# Ensure the api-unified root is on sys.path
_ROOT = Path(__file__).resolve().parents[3]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.modules.auth.services import get_user_by_email, update_user


def main():
    parser = argparse.ArgumentParser(description="Promover una cuenta local existente a administrador.")
    parser.add_argument("email")
    args = parser.parse_args()
    user = get_user_by_email(args.email)
    if not user or not user.get("is_active", True):
        parser.error("La cuenta no existe o esta desactivada. No se crearon usuarios.")
    try:
        updated_user = update_user(user["id"], {"role": "admin"})
    except Exception:
        parser.exit(1, f"{parser.prog}: no se pudo actualizar la cuenta.\n")
    if updated_user is None:
        parser.exit(1, f"{parser.prog}: la cuenta ya no está disponible.\n")
    print("Cuenta existente promovida a admin. Reinicia el backoffice y vuelve a iniciar sesion.")


if __name__ == "__main__":
    main()