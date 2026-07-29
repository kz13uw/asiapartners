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
    await db.flush()
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
    return company
