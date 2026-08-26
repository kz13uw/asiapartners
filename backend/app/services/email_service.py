import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.core.config import settings

logger = logging.getLogger("email_service")


async def send_otp_email(to_email: str, otp_code: str, purpose: str = "register") -> bool:
    """
    Отправка красивого HTML-письма с 6-значным OTP-кодом.
    При отсутствии SMTP параметров код выводится в консоль серверного лога.
    """
    subject = "Код подтверждения регистрации" if purpose == "register" else "Сброс пароля на портале Asia Partners"
    title_text = "Код подтверждения регистрации" if purpose == "register" else "Запрос на сброс пароля"
    action_text = "подтверждения создания аккаунта поставщика" if purpose == "register" else "установки нового пароля"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
            .container {{ max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
            .header {{ text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }}
            .header h2 {{ color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 700; }}
            .body-content {{ padding: 24px 0; text-align: center; }}
            .otp-box {{ background: #f1f5f9; border: 2px dashed #93c5fd; border-radius: 10px; padding: 16px 24px; display: inline-block; margin: 20px 0; letter-spacing: 6px; font-size: 32px; font-weight: 800; color: #1e40af; font-family: monospace; }}
            .footer {{ text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
            .note {{ font-size: 13px; color: #64748b; line-height: 1.5; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Asia Partners Procurement</h2>
            </div>
            <div class="body-content">
                <h3 style="color: #334155; margin-top: 0;">{title_text}</h3>
                <p class="note">Вы запросили одноразовый код для {action_text} на портале закупок Asia Partners.</p>
                <div class="otp-box">{otp_code}</div>
                <p class="note">Код действителен в течение <strong>5 минут</strong>.<br>Никому не сообщайте данный код.</p>
            </div>
            <div class="footer">
                <p>Если вы не запрашивали данный код, просто проигнорируйте это письмо.</p>
                <p>&copy; 2026 Asia Partners. Все права защищены.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Если SMTP данные не указаны в .env, выводим код в консоль (для локального тестирования)
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"🔑 [DEV MODE OTP] Код для {to_email} ({purpose}): >>> {otp_code} <<<")
        print(f"\n======================================================\n🔑 [OTP CODE FOR {to_email}]: {otp_code}\n======================================================\n")
        return True

    # Отправка через реальный SMTP (Gmail / Корпоративный)
    try:
        sender_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        from_header = f"{settings.SMTP_FROM_NAME} <{sender_email}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_header
        msg["To"] = to_email

        part = MIMEText(html_content, "html", "utf-8")
        msg.attach(part)

        # Выполняем подключение к SMTP (Порт 465 SSL для Яндекс/Mail.ru, порт 587 TLS для Gmail)
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(sender_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.ehlo()
                if settings.SMTP_PORT == 587:
                    server.starttls()
                    server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(sender_email, [to_email], msg.as_string())


        logger.info(f"✅ OTP email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to send OTP email to {to_email}: {e}")
        print(f"\n======================================================\n🔑 [FALLBACK OTP FOR {to_email}]: {otp_code}\n======================================================\n")
        return True

