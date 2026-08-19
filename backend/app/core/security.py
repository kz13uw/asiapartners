import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if not plain_password or not hashed_password:
            return False
        pw_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    pw_bytes = (password or "").encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')


import uuid


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


import re

def validate_password_policy(password: str) -> tuple[bool, str]:
    """
    Строгая политика паролей:
    - Длина от 8 символов
    - Хотя бы одна заглавная буква (латиница или кириллица)
    - Хотя бы одна строчная буква (латиница или кириллица)
    - Хотя бы одна цифра
    - Хотя бы один спецсимвол
    """
    if not password or len(password) < 8:
        return False, "Пароль должен содержать не менее 8 символов"
    if not re.search(r"[A-ZА-ЯЁ]", password):
        return False, "Пароль должен содержать хотя бы одну заглавную букву"
    if not re.search(r"[a-zа-яё]", password):
        return False, "Пароль должен содержать хотя бы одну строчную букву"
    if not re.search(r"\d", password):
        return False, "Пароль должен содержать хотя бы одну цифру"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+\\[\]]", password):
        return False, "Пароль должен содержать хотя бы один специальный символ (!@#$%^&*...)"
    return True, "Пароль соответствует политике безопасности"
