from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import ProcurementCategory, User, UserRole
from app.api.v1.auth import get_current_user

router = APIRouter(tags=["Категории закупок"])


# Схемы
class CategoryOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    icon: Optional[str] = None
    subject_type: Optional[str] = "goods"
    is_active: bool

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    icon: Optional[str] = "building"
    subject_type: Optional[str] = "goods"
    is_active: Optional[bool] = True


from app.core.cache import cache_response, cache_manager


@router.get("", response_model=List[CategoryOut], summary="Получить список категорий (Публичный)")
@cache_response(ttl_seconds=300, prefix="categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProcurementCategory).order_by(ProcurementCategory.name.asc()))
    return result.scalars().all()


@router.post("", response_model=CategoryOut, summary="Создать категорию (Только ADMIN)")
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Только Администратор может создавать категории")

    from app.models.models import TenderSubjectType
    subj_val = TenderSubjectType.SERVICES_WORKS if data.subject_type in ["services", "services_works", "work"] else TenderSubjectType.GOODS

    # Проверка уникальности
    existing = await db.execute(
        select(ProcurementCategory).where(
            (ProcurementCategory.code == data.code) | (ProcurementCategory.name == data.name)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Категория с таким именем или кодом уже существует")

    cat = ProcurementCategory(
        name=data.name,
        code=data.code,
        description=data.description,
        icon=data.icon,
        subject_type=subj_val,
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    await cache_manager.delete("categories:*")
    return cat


@router.delete("/{category_id}", summary="Удалить категорию (Только ADMIN)")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Только Администратор может удалять категории")

    cat = await db.get(ProcurementCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    await db.delete(cat)
    await db.commit()
    await cache_manager.delete("categories:*")
    return {"message": "Категория успешно удалена"}
