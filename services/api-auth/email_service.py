"""
Servicio de envío de email transaccional mediante Resend.

Requiere la variable de entorno RESEND_API_KEY.
"""

import logging
import os

from dotenv import load_dotenv
from resend import Emails

load_dotenv()


RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_ADDRESS = os.getenv("RESEND_FROM_ADDRESS", "onboarding@resend.dev")

logger = logging.getLogger("api-auth.email")


def send_reset_email(email_to: str, reset_url: str, user_name: str | None = None) -> bool:
    """Envía un email con el enlace de restablecimiento de contraseña.

    Args:
        email_to: Dirección de correo del destinatario.
        reset_url: URL completa con el token para restablecer la contraseña.
        user_name: Nombre del usuario (opcional, para personalizar el saludo).

    Returns:
        True si el email se encoló correctamente, False en caso contrario.
    """
    if not RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY no está configurado. "
            "No se puede enviar el email de restablecimiento."
        )
        return False

    greeting = f"Hola {user_name}," if user_name else "Hola,"
    body_html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr>
      <td style="background:#f5f5f5;border-radius:8px;padding:32px 24px;">
        <h1 style="font-size:22px;margin:0 0 16px;">Brasaland Backoffice</h1>
        <p style="font-size:15px;line-height:1.5;margin:0 0 20px;">
          {greeting}
        </p>
        <p style="font-size:15px;line-height:1.5;margin:0 0 20px;">
          Recibiste este correo porque solicitaste restablecer la contraseña
          de tu cuenta en el panel de administración de Brasaland.
        </p>
        <p style="font-size:15px;line-height:1.5;margin:0 0 20px;">
          Haz clic en el siguiente enlace para crear una contraseña nueva:
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr>
            <td style="background:#1a1a2e;border-radius:6px;padding:12px 24px;">
              <a href="{reset_url}"
                 style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
                 Restablecer contraseña
              </a>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:#666;line-height:1.4;margin:0 0 8px;">
          Este enlace expira en 30 minutos. Si no solicitaste este cambio,
          puedes ignorar este mensaje.
        </p>
        <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
        <p style="font-size:12px;color:#888;margin:0;">
          Brasaland Digital · Medellín + Miami
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""

    try:
        # Configurar la API key global de Resend
        import resend
        resend.api_key = RESEND_API_KEY

        params: dict = {
            "from": FROM_ADDRESS,
            "to": email_to,
            "subject": "Brasaland — Restablecimiento de contraseña",
            "html": body_html,
        }

        response = Emails.send(params)
        logger.info(
            "Email de restablecimiento enviado a %s (id=%s)",
            email_to,
            response.get("id") if isinstance(response, dict) else response,
        )
        return True

    except Exception:
        logger.exception(
            "Error al enviar email de restablecimiento a %s", email_to
        )
        return False