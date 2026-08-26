from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.db.session import get_db
from app.models.models import User, UserStatus, UserRole, AuditLog
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshRequest, EdsLoginRequest
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except Exception:
        return None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    from app.models.models import TokenBlacklist
    # Проверка на токен в блэклисте
    blacklisted = await db.execute(select(TokenBlacklist).where(TokenBlacklist.token == token))
    if blacklisted.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен отозван")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    result = await db.execute(select(User).where(User.id == user_id_int))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")
    return user


@router.post("/login", response_model=TokenResponse, summary="Вход по логину/паролю")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db), request: Request = None):
    from sqlalchemy import func
    from app.core.security import get_password_hash
    uname = (form_data.username or "").strip().lower()
    
    result = await db.execute(
        select(User).where(
            (func.lower(User.email) == uname) | 
            (func.lower(User.username) == uname) | 
            (func.lower(User.account_code) == uname) |
            (User.iin_bin == uname)
        )
    )
    user = result.scalars().first()


    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    if user.status == UserStatus.BLOCKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ваш аккаунт заблокирован Службой Безопасности")

    is_pwd_ok = verify_password(form_data.password, user.hashed_password) if user.hashed_password else False

    if not is_pwd_ok:
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= 5:
            user.status = UserStatus.BLOCKED
            log_lock = AuditLog(
                user_id=user.id,
                action="ACCOUNT_LOCKED_BRUTE_FORCE",
                entity_type="user",
                entity_id=user.id,
                payload="Превышено 5 попыток ввода неверного пароля"
            )
            db.add(log_lock)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Превышено 5 неверных попыток входа. Аккаунт заблокирован!"
            )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )

    # Успешный вход — сбрасываем счетчик неудачных попыток
    user.failed_login_attempts = 0

    # Обновить время последнего входа
    user.last_login = datetime.utcnow()

    # Аудит
    ip_addr = request.client.host if (request and request.client) else None
    log = AuditLog(user_id=user.id, ip_address=ip_addr, action="LOGIN", entity_type="user", entity_id=user.id)
    db.add(log)
    await db.commit()

    if not user.account_code or (user.email and user.account_code != user.email):
        from app.models.models import generate_account_code
        user.account_code = generate_account_code(user.id, user.role, user.email)
        await db.commit()

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        account_code=user.computed_account_code,
        role=user.role,
        full_name=user.full_name,
    )


@router.post("/login/eds", response_model=TokenResponse, summary="Вход по ЭЦП (НУЦ РК)")
async def login_by_eds(payload: EdsLoginRequest, db: AsyncSession = Depends(get_db), request: Request = None):
    import base64
    import re
    from app.models.models import Company, UserRole, generate_account_code

    from app.core.kalkan_verifier import verify_and_parse_cms

    from app.core.config import settings
    is_demo = settings.DEBUG and (payload.cms_base64.startswith("demo_") or payload.cms_base64 == "demo_signed_cms_base64_hash_12345")
    if is_demo:
        parsed = {"valid": True, "bin": getattr(payload, "company_bin", None) or "210440012345", "iin": "850101400823", "company_name": payload.company_name or "ТОО Asia Procurement"}
    else:
        parsed = verify_and_parse_cms(payload.cms_base64)

    if not parsed.get("valid"):
        raise HTTPException(status_code=400, detail=parsed.get("error", "Неверный штамп ЭЦП"))

    company_bin = parsed.get("bin") or parsed.get("iin") or ("210440012345" if is_demo else None)
    iin = parsed.get("iin") or company_bin or ("850101400823" if is_demo else None)

    if not company_bin and not is_demo:
        raise HTTPException(
            status_code=400,
            detail="Не удалось определить БИН/ИИН из ключа ЭЦП. Проверьте сертификат."
        )

    if is_demo:
        subject_name = payload.company_name or "ТОО Asia Procurement (Демо)"
    else:
        subject_name = parsed.get("company_name") or payload.company_name or "Пользователь НУЦ РК"

    req_address = payload.company_address or payload.address
    req_phone = payload.phone
    req_email = payload.email
    req_director = payload.director_name
    req_comp_name = payload.company_name

    # 1. Ищем или создаем пользователя
    res = await db.execute(select(User).where(User.iin_bin == iin))
    user = res.scalar_one_or_none()
    is_new_user = False
    
    if not user:
        is_new_user = True  # новый пользователь — показать форму регистрации
        user = User(
            iin_bin=iin,
            full_name=req_director or subject_name,
            email=req_email or f"supplier_{iin}@asia.kz",
            phone=req_phone,
            role=UserRole.SUPPLIER,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        await db.flush()
        user.account_code = generate_account_code(user.id, user.role, user.email)
    else:
        if req_email: user.email = req_email
        if req_phone: user.phone = req_phone
        if req_director: user.full_name = req_director

    # 2. Ищем или создаем компанию с привязкой к пользователю
    company = None
    if company_bin:
        res = await db.execute(select(Company).where(Company.bin == company_bin))
        company = res.scalar_one_or_none()
        if not company:
            company = Company(
                bin=company_bin,
                full_name=req_comp_name or f"ТОО {company_bin}",
                legal_form="ТОО",
                address=req_address,
                phone=req_phone,
                email=req_email,
                director_name=req_director,
                is_accredited=True,
                owner_id=user.id
            )
            db.add(company)
            await db.flush()
        else:
            if req_address: company.address = req_address
            if req_phone: company.phone = req_phone
            if req_email: company.email = req_email
            if req_director: company.director_name = req_director
            if company.owner_id is None: company.owner_id = user.id
            company.is_accredited = True

    if not user.account_code or (user.email and user.account_code != user.email):
        user.account_code = generate_account_code(user.id, user.role, user.email)

    user.last_login = datetime.utcnow()
    await db.commit()

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        account_code=user.computed_account_code,
        role=user.role,
        full_name=user.full_name,
        is_new_user=is_new_user,
    )


@router.post("/refresh", response_model=TokenResponse, summary="Обновить токен")
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    from app.models.models import TokenBlacklist
    # Проверка: токен не отозван
    blacklisted = await db.execute(select(TokenBlacklist).where(TokenBlacklist.token == body.refresh_token))
    if blacklisted.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен отозван")

    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный refresh-токен")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        account_code=user.computed_account_code,
        role=user.role,
        full_name=user.full_name,
    )


@router.post("/logout", summary="Выход")
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    body: Optional[RefreshRequest] = None,
):
    from app.models.models import TokenBlacklist
    # Добавляем access_token в blacklist
    if token:
        db.add(TokenBlacklist(token=token, user_id=current_user.id))
    # [P1-FIX] Также добавляем refresh_token в blacklist, чтобы он больше не был валиден
    if body and body.refresh_token:
        db.add(TokenBlacklist(token=body.refresh_token, user_id=current_user.id))

    log = AuditLog(user_id=current_user.id, ip_address=request.client.host if request else None, action="LOGOUT", entity_type="user", entity_id=current_user.id)
    db.add(log)
    await db.commit()
    return {"message": "Выход выполнен успешно"}


# ===== OTP & SUPPLIER REGISTRATION ENDPOINTS =====

import logging
logger = logging.getLogger("auth_api")

from app.schemas.schemas import SendOtpRequest, VerifyOtpRequest, RegisterSupplierRequest, ResetPasswordRequest
from app.services.otp_service import check_rate_limits, generate_otp_code, store_otp, verify_otp
from app.services.email_service import send_otp_email
from app.db.session import get_redis
from redis.asyncio import Redis


@router.post("/send-otp", summary="Отправить OTP-код на email")
async def send_otp(
    body: SendOtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    email_clean = body.email.strip().lower()
    client_ip = request.client.host if request and request.client else "127.0.0.1"

    # Проверка лимитов (cooldown 60s, max 10/hr per IP)
    allowed, limit_msg = await check_rate_limits(redis, email_clean, client_ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=limit_msg)

    # Проверка существования пользователя
    existing = await db.execute(select(User).where(User.email == email_clean))
    existing_user = existing.scalar_one_or_none()

    if body.purpose == "register":
        if existing_user:
            raise HTTPException(status_code=400, detail="Пользователь с такой почтой уже зарегистрирован. Войдите по логину и паролю.")
    elif body.purpose == "reset_password":
        if not existing_user:
            raise HTTPException(status_code=404, detail="Пользователь с такой почтой не найден в системе.")

    # Генерация и хранение
    code = generate_otp_code()
    await store_otp(redis, email_clean, client_ip, code)

    # Отправка по SMTP
    sent = await send_otp_email(email_clean, code, body.purpose)
    if not sent:
        logger.warning(f"OTP email failed for {email_clean}, fallback code logged to console.")

    return {"message": f"Код подтверждения успешно отправлен на {email_clean}"}


@router.post("/verify-otp", summary="Проверить OTP-код")
async def verify_otp_endpoint(
    body: VerifyOtpRequest,
    redis: Redis = Depends(get_redis)
):
    is_valid, msg = await verify_otp(redis, body.email, body.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": "Код успешно подтвержден", "valid": True}


@router.post("/register-supplier", response_model=TokenResponse, status_code=201, summary="Регистрация поставщика (Email, Пароль, OTP)")
async def register_supplier(
    body: RegisterSupplierRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    email_clean = body.email.strip().lower()

    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Пароли не совпадают.")

    from app.core.security import validate_password_policy, get_password_hash
    valid_pwd, pwd_msg = validate_password_policy(body.password)
    if not valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_msg)

    # Проверка и сгорание OTP из Redis
    is_valid_otp, otp_msg = await verify_otp(redis, email_clean, body.otp_code)
    if not is_valid_otp:
        raise HTTPException(status_code=400, detail=otp_msg)

    # Проверка повторной регистрации
    existing = await db.execute(select(User).where(User.email == email_clean))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует.")

    # Создание пользователя
    from app.models.models import generate_account_code, Company
    user = User(
        email=email_clean,
        username=email_clean,
        account_code=email_clean,
        full_name=body.full_name.strip(),
        iin_bin=body.iin_bin.strip() if body.iin_bin else None,
        phone=body.phone.strip() if body.phone else None,
        role=UserRole.SUPPLIER,
        status=UserStatus.ACTIVE,
        hashed_password=get_password_hash(body.password),
    )
    db.add(user)
    await db.flush()

    user.account_code = generate_account_code(user.id, user.role, email_clean)
    user.last_login = datetime.utcnow()

    # Если переданы БИН/Наименование/Адрес компании — сразу создаем или привязываем профиль компании
    comp_name = body.company_name.strip() if body.company_name else body.full_name.strip()
    comp_bin = body.iin_bin.strip() if body.iin_bin else None
    comp_addr = body.company_address.strip() if body.company_address else None

    if comp_bin or comp_name:
        existing_comp = await db.execute(select(Company).where(Company.owner_id == user.id))
        comp = existing_comp.scalar_one_or_none()
        if not comp:
            comp = Company(
                owner_id=user.id,
                bin=comp_bin or f"99{user.id:010d}",
                full_name=comp_name,
                legal_form="TOO" if "TOO" in comp_name.upper() else "IP",
                address=comp_addr or "г. Семей, Казахстан",
                phone=body.phone.strip() if body.phone else None,
                email=email_clean,
                director_name=body.full_name.strip()
            )
            db.add(comp)
        else:
            if comp_bin: comp.bin = comp_bin
            if comp_name: comp.full_name = comp_name
            if comp_addr: comp.address = comp_addr

    log = AuditLog(
        user_id=user.id,
        ip_address=request.client.host if request and request.client else None,
        action="REGISTER_SUPPLIER",
        entity_type="user",
        entity_id=user.id
    )
    db.add(log)
    await db.commit()


    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        account_code=user.computed_account_code,
        role=user.role,
        full_name=user.full_name,
        is_new_user=True
    )


@router.post("/reset-password", summary="Сброс пароля по OTP-коду")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    email_clean = body.email.strip().lower()

    # Проверка и сгорание OTP
    is_valid_otp, otp_msg = await verify_otp(redis, email_clean, body.otp_code)
    if not is_valid_otp:
        raise HTTPException(status_code=400, detail=otp_msg)

    from app.core.security import validate_password_policy, get_password_hash
    valid_pwd, pwd_msg = validate_password_policy(body.new_password)
    if not valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_msg)

    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден.")

    user.hashed_password = get_password_hash(body.new_password)
    user.password_changed_at = datetime.utcnow()
    user.failed_login_attempts = 0
    user.status = UserStatus.ACTIVE

    db.add(user)
    await db.commit()

    return {"message": "Пароль успешно изменён! Войдите с новым паролем."}

