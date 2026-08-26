from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import User, Company, UserRole, UserStatus
from app.schemas.schemas import UserCreate, UserOut, CompanyCreate, CompanyOut
from app.api.v1.auth import get_current_user
from app.api.v1.tenders import require_role
from app.core.security import get_password_hash

router = APIRouter()


@router.get("/me", response_model=UserOut, summary="Текущий пользователь")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/company", response_model=CompanyOut, summary="Моя компания")
async def get_my_company(
    current_user: User = Depends(require_role(UserRole.SUPPLIER)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.owner_id == current_user.id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не зарегистрирована")
    return company


@router.post("/me/company", response_model=CompanyOut, status_code=201, summary="Зарегистрировать компанию")
async def register_company(
    body: CompanyCreate,
    current_user: User = Depends(require_role(UserRole.SUPPLIER)),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Company).where(Company.owner_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Компания уже зарегистрирована")

    company = Company(**body.model_dump(), owner_id=current_user.id)
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.put("/me/company", response_model=CompanyOut, summary="Обновить реквизиты компании")
async def update_company(
    body: CompanyCreate,
    current_user: User = Depends(require_role(UserRole.SUPPLIER)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.owner_id == current_user.id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    await db.commit()
    await db.refresh(company)
    return company


# ===== PROFILE & PASSWORD MANAGEMENT =====

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


@router.put("/me", response_model=UserOut, summary="Обновить профиль пользователя")
async def update_my_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name:
        current_user.full_name = body.full_name.strip()
    if body.email and body.email.strip():
        email_clean = body.email.strip().lower()
        current_user.email = email_clean
        current_user.account_code = email_clean
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/change-password", summary="Сменить текущий пароль")
async def change_my_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.core.security import verify_password, get_password_hash, validate_password_policy
    if current_user.hashed_password and not verify_password(body.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверно указан текущий (старый) пароль")
    
    new_pwd = (body.new_password or "").strip()
    is_valid, msg = validate_password_policy(new_pwd)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    current_user.hashed_password = get_password_hash(new_pwd)
    current_user.password_changed_at = datetime.utcnow()
    current_user.failed_login_attempts = 0
    current_user.status = UserStatus.ACTIVE
    db.add(current_user)
    await db.commit()
    return {"message": "Пароль успешно изменен"}

