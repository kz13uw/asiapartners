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


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")
    return user


@router.post("/login", response_model=TokenResponse, summary="Вход по email/паролю")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db), request: Request = None):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")

    # Обновить время последнего входа
    user.last_login = datetime.utcnow()

    # Аудит
    log = AuditLog(user_id=user.id, ip_address=request.client.host if request else None, action="LOGIN", entity_type="user", entity_id=user.id)
    db.add(log)

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
    )


@router.post("/login/eds", response_model=TokenResponse, summary="Вход по ЭЦП (НУЦ РК)")
async def login_by_eds(payload: EdsLoginRequest, db: AsyncSession = Depends(get_db), request: Request = None):
    import base64
    import re
    from app.models.models import Company, UserRole

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
        raise HTTPException(status_code=400, detail="Сертификат не содержит ИИН (IIN)")

    # Временно: Для демо-заглушки, если ничего не найдено, берем тестовые данные
    if iin == "123456789012" and not company_bin:
        company_bin = "987654321012"
        subject_name = "Тестовый Поставщик (Мок)"
    else:
        subject_name = "Пользователь НУЦ РК"

    # Ищем или создаем компанию
    company = None
    if company_bin:
        res = await db.execute(select(Company).where(Company.bin == company_bin))
        company = res.scalar_one_or_none()
        if not company:
            # Создаем новую компанию
            company = Company(
                bin=company_bin,
                full_name=f"ТОО {company_bin}",
                legal_form="ТОО",
                is_accredited=False,
                owner_id=1  # Временно заглушка, позже привяжем к юзеру
            )
            db.add(company)
            await db.flush()

    # Ищем или создаем пользователя
    res = await db.execute(select(User).where(User.iin_bin == iin))
    user = res.scalar_one_or_none()
    
    if not user:
        user = User(
            iin_bin=iin,
            full_name=subject_name,
            role=UserRole.SUPPLIER,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        await db.flush()
        
        # Если создали компанию, назначаем этого пользователя владельцем
        if company and company.owner_id == 1:
            company.owner_id = user.id

    # Привязываем юзера к компании
    if company:
        # Для связи через relationship (company_id нету, есть owner_id и ForeignKey("Company.owner_id") в юзере, но лучше связать).
        # В нашей модели: user.company_id нет, есть company.users
        # Просто оставим как есть.
        pass

    user.last_login = datetime.utcnow()
    await db.commit()

    token_data = {"sub": str(user.id), "role": user.role.value}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
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
        role=user.role,
        full_name=user.full_name,
    )


@router.post("/logout", summary="Выход")
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), request: Request = None):
    log = AuditLog(user_id=current_user.id, ip_address=request.client.host if request else None, action="LOGOUT", entity_type="user", entity_id=current_user.id)
    db.add(log)
    return {"message": "Выход выполнен успешно"}
