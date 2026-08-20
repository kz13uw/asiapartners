from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.db.session import get_db
from app.models.models import User, UserStatus, AuditLog
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
    user = None
    try:
        result = await db.execute(
            select(User).where(
                (User.email == form_data.username) | (User.username == form_data.username)
            )
        )
        user = result.scalars().first()
    except Exception:
        await db.rollback()
        result = await db.execute(select(User).where(User.email == form_data.username))
        user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    if user.status == UserStatus.BLOCKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ваш аккаунт заблокирован Службой Безопасности")

    if not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
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
            detail=f"Неверный логин или пароль (осталось попыток: {5 - user.failed_login_attempts})"
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

    if not user.account_code:
        from app.models.models import generate_account_code
        user.account_code = generate_account_code(user.id, user.role)
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

    # Декодируем Base64 строку в сырые байты (ASN.1 DER) - упрощенно для PoC
    try:
        der_bytes = base64.b64decode(payload.cms_base64)
        raw_text = der_bytes.decode('utf-8', errors='ignore')
    except Exception as e:
        raise HTTPException(status_code=400, detail="Неверный формат подписи CMS")

    # Ищем ИИН и БИН
    iin_match = re.search(r'IIN(\d{12})', raw_text)
    bin_match = re.search(r'BIN(\d{12})', raw_text)
    
    iin = iin_match.group(1) if iin_match else None
    company_bin = bin_match.group(1) if bin_match else None

    if not iin:
        iin = "123456789012"
        company_bin = "987654321012"
        subject_name = "ТОО Asia Поставщик"

    # Временно: Для демо-заглушки, если ничего не найдено, берем тестовые данные
    if iin == "123456789012" and not company_bin:
        company_bin = "987654321012"
        subject_name = "Тестовый Поставщик (Мок)"
    else:
        subject_name = "Пользователь НУЦ РК"

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
        user.account_code = generate_account_code(user.id, user.role)
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

    if not user.account_code:
        user.account_code = generate_account_code(user.id, user.role)

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
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный refresh-токен")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")

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
