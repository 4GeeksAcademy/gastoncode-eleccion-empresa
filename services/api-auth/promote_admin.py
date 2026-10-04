import argparse

from services import get_user_by_email, update_user


def main():
    parser = argparse.ArgumentParser(description="Promover una cuenta local existente a administrador.")
    parser.add_argument("email")
    args = parser.parse_args()
    user = get_user_by_email(args.email)
    if not user or not user.get("is_active", True):
        parser.error("La cuenta no existe o esta desactivada. No se crearon usuarios.")
    update_user(user["id"], {"role": "admin"})
    print("Cuenta existente promovida a admin. Reinicia el backoffice y vuelve a iniciar sesion.")


if __name__ == "__main__":
    main()