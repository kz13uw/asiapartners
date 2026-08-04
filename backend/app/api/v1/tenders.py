from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.models import Tender, TenderStatus, TenderDocument, AuditLog, User, UserRole
from app.schemas.schemas import TenderCreate, TenderUpdate, TenderOut, TenderListOut
from app.api.v1.auth import get_current_user

router = APIRouter()


def generate_tender_number() -> str:
    year = datetime.utcnow().year
    uid = str(uuid.uuid4())[:4].upper()
    return f"T-{year}-{uid}"


def require_role(*roles: UserRole):
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        return current_user
    return checker


# ===== PUBLIC =====

@router.get("", response_model=TenderListOut, summary="Реестр открытых тендеров (публичный)")
async def list_tenders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    method: str = Query(None),
    category_id: int = Query(None),
    status_filter: str = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Tender).where(Tender.status.in_([TenderStatus.ACCEPTING, TenderStatus.EVALUATION, TenderStatus.COMPLETED]))

    if search:
        query = query.where(Tender.title.ilike(f"%{search}%"))
    if method:
        query = query.where(Tender.method == method)
    if category_id:
        query = query.where(Tender.category_id == category_id)
    if status_filter:
        target_status = TenderStatus.ACCEPTING if status_filter == "published" else status_filter
        query = query.where(Tender.status == target_status)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    query = query.offset((page - 1) * size).limit(size).order_by(Tender.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    return TenderListOut(items=items, total=total, page=page, size=size)


@router.get("/{tender_id}", response_model=TenderOut, summary="Карточка тендера")
async def get_tender(tender_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tender).where(Tender.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    return tender


# ===== ORGANIZER =====

@router.post("", response_model=TenderOut, status_code=201, summary="Создать тендер (черновик)")
async def create_tender(
    body: TenderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    tender = Tender(
        **body.model_dump(),
        number=generate_tender_number(),
        organizer_id=current_user.id,
    )
    db.add(tender)
    await db.flush()

    log = AuditLog(user_id=current_user.id, action="CREATE_TENDER", entity_type="tender", entity_id=tender.id)
    db.add(log)

    return tender


@router.patch("/{tender_id}", response_model=TenderOut, summary="Обновить черновик тендера")
async def update_tender(
    tender_id: int,
    body: TenderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    result = await db.execute(select(Tender).where(Tender.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if tender.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тендеру")
    if tender.status != TenderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Редактирование возможно только для черновиков")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tender, field, value)
    return tender


@router.post("/{tender_id}/publish", response_model=TenderOut, summary="Опубликовать тендер (ЭЦП)")
async def publish_tender(
    tender_id: int,
    eds_hash: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    result = await db.execute(select(Tender).where(Tender.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if tender.status != TenderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Можно публиковать только черновик")

    tender.status = TenderStatus.ACCEPTING
    tender.eds_hash = eds_hash
    tender.published_at = datetime.utcnow()

    log = AuditLog(user_id=current_user.id, action="PUBLISH_TENDER", entity_type="tender", entity_id=tender.id)
    db.add(log)
    return tender


@router.get("/my/list", response_model=TenderListOut, summary="Мои тендеры (для организатора)")
async def my_tenders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    query = select(Tender).where(Tender.organizer_id == current_user.id)
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    query = query.offset((page - 1) * size).limit(size).order_by(Tender.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()
    return TenderListOut(items=items, total=total, page=page, size=size)


@router.delete("/{tender_id}", summary="Удалить тендер")
async def delete_tender(
    tender_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    result = await db.execute(select(Tender).where(Tender.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if current_user.role != UserRole.ADMIN and tender.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав на удаление этого тендера")
    
    await db.delete(tender)
    log = AuditLog(user_id=current_user.id, action="DELETE_TENDER", entity_type="tender", entity_id=tender_id)
    db.add(log)
    await db.commit()
    return {"message": "Тендер успешно удален"}
