import argparse

from services import get_user_by_email, update_user


def main():
    parser = argparse.ArgumentParser(description="Promover una cuenta local existente a administrador.")
    parser.add_argument(
        "--activate",
        action="store_true",
        help="Activar también la cuenta existente antes de promoverla.",
    )
    parser.add_argument("email")
    args = parser.parse_args()
    user = get_user_by_email(args.email)
    if not user:
        parser.error("La cuenta no existe. No se crearon usuarios.")
    if not user.get("is_active", True) and not args.activate:
        parser.error("La cuenta esta desactivada; usar --activate para activarla.")
    changes = {"role": "admin"}
    if args.activate:
        changes["is_active"] = True
    try:
        updated_user = update_user(user["id"], changes)
    except Exception:
        parser.exit(1, f"{parser.prog}: no se pudo actualizar la cuenta.\n")
    if updated_user is None:
        parser.exit(1, f"{parser.prog}: la cuenta ya no está disponible.\n")
    print("Cuenta existente promovida a admin. Reinicia el backoffice y vuelve a iniciar sesion.")


if __name__ == "__main__":
    main()