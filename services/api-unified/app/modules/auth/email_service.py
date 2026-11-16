"""Email service for password reset notifications via Resend."""

import logging
import os

logger = logging.getLogger("api-unified.auth.email_service")


def send_reset_email(email_to: str, reset_url: str, user_name: str | None = None) -> bool:
    """Send a password-reset email via the Resend API.

    Returns True when the send was attempted (success or failure is not
    propagated to callers to avoid email enumeration).
    """
    resend_api_key = os.getenv("RESEND_API_KEY")
    if not resend_api_key:
        logger.warning("RESEND_API_KEY no está configurado; email no enviado")
        return False

    try:
        import resend

        resend.api_key = resend_api_key

        greeting = f" Hola {user_name}," if user_name else ""
        params = {
            "from": os.getenv(
                "RESEND_FROM_ADDRESS",
                "Brasaland <noreply@brasaland.com>",
            ),
            "to": [email_to],
            "subject": "Restablece tu contraseña",
            "html": f"""
                <p{greeting}</p>
                <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                <p>
                    <a href="{reset_url}">Haz clic aquí para restablecerla</a>
                </p>
                <p>Si no solicitaste este cambio, ignora este mensaje.</p>
            """,
        }
        resend.Emails.send(params)
    except Exception as error:
        logger.warning("Failed to send reset email (%s)", type(error).__name__)
    return True
