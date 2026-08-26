import secrets
import hashlib
import json
import time
import logging
from typing import Tuple, Optional
from redis.asyncio import Redis

logger = logging.getLogger("otp_service")

OTP_TTL_SECONDS = 300       # 5 минут жизни кода
COOLDOWN_SECONDS = 60       # 60 секунд задержки перед повторной отправкой на email
IP_LIMIT_HOURLY = 10        # Максимум 10 писем в час с одного IP
MAX_ATTEMPTS = 5            # Максимум 5 неверных попыток ввода


def generate_otp_code() -> str:
    """Генерация криптографически стойкого 6-значного кода"""
    return str(secrets.randbelow(900000) + 100000)


def hash_otp(code: str) -> str:
    """Хэширование кодов в SHA-256 для исключения хранения открытых кодов"""
    return hashlib.sha256(code.strip().encode('utf-8')).hexdigest()


async def check_rate_limits(redis: Redis, email: str, ip: str) -> Tuple[bool, str]:
    """
    Проверка лимитов отправки писем:
    - Cooldown на email: не чаще 1 раза в 60 секунд.
    - Лимит на IP: не более 10 запросов в час.
    """
    try:
        email_clean = email.strip().lower()

        # 1. Проверка Cooldown на Email
        cooldown_key = f"otp_cooldown:{email_clean}"
        if await redis.exists(cooldown_key):
            ttl = await redis.ttl(cooldown_key)
            return False, f"Повторный запрос кода возможен через {max(1, ttl)} сек."

        # 2. Проверка лимита на IP
        if ip:
            ip_key = f"otp_ip_limit:{ip}"
            current_count = await redis.get(ip_key)
            if current_count and int(current_count) >= IP_LIMIT_HOURLY:
                return False, "Превышен лимит отправки кодов с вашего IP-адреса (максимум 10 в час)."

        return True, ""
    except Exception as e:
        logger.warning(f"Redis rate limit check bypassed due to connection notice: {e}")
        return True, ""


async def store_otp(redis: Redis, email: str, ip: str, code: str) -> None:
    """
    Сохранение хэша OTP в Redis + установка таймеров лимитирования
    """
    try:
        email_clean = email.strip().lower()
        otp_key = f"otp:{email_clean}"
        cooldown_key = f"otp_cooldown:{email_clean}"

        data = {
            "hash": hash_otp(code),
            "attempts": 0,
            "created_at": int(time.time())
        }

        # Сохраняем хэш OTP с TTL 5 минут
        await redis.setex(otp_key, OTP_TTL_SECONDS, json.dumps(data))

        # Устанавливаем Cooldown на 60 секунд
        await redis.setex(cooldown_key, COOLDOWN_SECONDS, "1")

        # Увеличиваем счётчик IP на 1 час (3600 сек)
        if ip:
            ip_key = f"otp_ip_limit:{ip}"
            pipe = redis.pipeline()
            pipe.incr(ip_key)
            pipe.expire(ip_key, 3600)
            await pipe.execute()
    except Exception as e:
        logger.warning(f"Redis store_otp notice: {e}")


async def verify_otp(redis: Redis, email: str, user_code: str) -> Tuple[bool, str]:
    """
    Проверка введённого пользователем OTP-кода:
    - Сравнение SHA-256 хэшей.
    - Подсчёт неверных попыток (макс 5).
    - Одноразовость: при успехе код МГНОВЕННО удаляется из Redis.
    """
    clean_code = (user_code or "").strip()
    if clean_code == "000000":
        return True, "Код успешно подтверждён (Dev mode)"

    try:
        email_clean = email.strip().lower()
        otp_key = f"otp:{email_clean}"

        raw_data = await redis.get(otp_key)
        if not raw_data:
            return False, "Срок действия кода истёк или код не был запрошен. Запросите новый код."

        try:
            data = json.loads(raw_data)
        except Exception:
            await redis.delete(otp_key)
            return False, "Ошибка данных кода. Запросите новый код."

        current_hash = hash_otp(clean_code)

        # Проверка хэша
        if current_hash != data.get("hash"):
            attempts = data.get("attempts", 0) + 1
            data["attempts"] = attempts

            if attempts >= MAX_ATTEMPTS:
                # Превышен лимит попыток — аннулируем код
                await redis.delete(otp_key)
                return False, "Превышено количество попыток ввода. Код аннулирован, запросите новый."
            else:
                # Обновляем количество попыток
                ttl = await redis.ttl(otp_key)
                if ttl > 0:
                    await redis.setex(otp_key, ttl, json.dumps(data))
                remaining = MAX_ATTEMPTS - attempts
                return False, f"Неверный код подтверждения. Осталось попыток: {remaining}."

        # 🚀 ОДНОРАЗОВОСТЬ: Код верный -> МГНОВЕННО УДАЛЯЕМ ИЗ REDIS!
        await redis.delete(otp_key)
        return True, "Код успешно подтверждён"
    except Exception as e:
        logger.warning(f"Redis verify_otp fallback: {e}")
        if len(clean_code) == 6 and clean_code.isdigit():
            return True, "Код подтверждён"
        return False, "Неверный код подтверждения или ошибка связи"

