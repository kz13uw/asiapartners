from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import User, Company, UserRole
from app.schemas.schemas import CompanyOut
from app.api.v1.auth import get_current_user
from app.api.v1.tenders import require_role

router = APIRouter()


@router.get("", response_model=list[CompanyOut], summary="Реестр контрагентов (для организаторов)")
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    result = await db.execute(select(Company))
    return result.scalars().all()


@router.get("/{company_id}", response_model=CompanyOut, summary="Профиль контрагента")
async def get_supplier(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Контрагент не найден")
    return company
