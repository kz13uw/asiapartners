from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import Bid, BidStatus, Tender, TenderStatus, User, UserRole, AuditLog, Protocol
from app.schemas.schemas import BidCreate, BidStatusUpdate, BidOut
from app.api.v1.auth import get_current_user
from app.api.v1.tenders import require_role
from datetime import datetime

router = APIRouter()


@router.post("", response_model=BidOut, status_code=201, summary="Подать заявку")
async def submit_bid(
    body: BidCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPPLIER)),
):
    # Проверяем тендер
    result = await db.execute(select(Tender).where(Tender.id == body.tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if tender.status not in [TenderStatus.ACCEPTING, TenderStatus.AUCTION]:
        raise HTTPException(status_code=400, detail="Прием заявок закрыт")
    if body.price >= tender.start_price:
        raise HTTPException(status_code=400, detail=f"Цена должна быть ниже стартовой ({tender.start_price:,.0f} тнг)")

    # Проверяем, нет ли уже заявки от этого пользователя
    existing = await db.execute(
        select(Bid).where(Bid.tender_id == body.tender_id, Bid.supplier_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Вы уже подали заявку на этот тендер")

    # Получаем компанию пользователя
    from app.models.models import Company
    comp_result = await db.execute(select(Company).where(Company.owner_id == current_user.id))
    company = comp_result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=400, detail="Сначала зарегистрируйте компанию в профиле")

    bid = Bid(
        tender_id=body.tender_id,
        supplier_id=current_user.id,
        company_id=company.id,
        price=body.price,
        eds_hash=body.eds_hash,
    )
    db.add(bid)
    await db.flush()

    log = AuditLog(user_id=current_user.id, action="SUBMIT_BID", entity_type="bid", entity_id=bid.id)
    db.add(log)
    return bid


@router.get("/tender/{tender_id}", response_model=list[BidOut], summary="Заявки по тендеру (для организатора)")
async def get_bids_by_tender(
    tender_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.COMMISSION)),
):
    result = await db.execute(select(Bid).where(Bid.tender_id == tender_id).order_by(Bid.price.asc()))
    bids = result.scalars().all()
    return bids


@router.patch("/{bid_id}/status", response_model=BidOut, summary="Изменить статус заявки (допуск/отклонение)")
async def update_bid_status(
    bid_id: int,
    body: BidStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.COMMISSION)),
):
    result = await db.execute(select(Bid).where(Bid.id == bid_id))
    bid = result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if body.status == BidStatus.REJECTED and not body.rejection_reason:
        raise HTTPException(status_code=400, detail="Укажите причину отклонения")

    bid.status = body.status
    if body.rejection_reason:
        bid.rejection_reason = body.rejection_reason

    log = AuditLog(
        user_id=current_user.id,
        action=f"BID_STATUS_{body.status.upper()}",
        entity_type="bid",
        entity_id=bid.id,
    )
    db.add(log)
    return bid


@router.post("/tender/{tender_id}/protocol", summary="Сформировать и подписать протокол итогов")
async def generate_protocol(
    tender_id: int,
    eds_hash: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    """Определяет победителя (наименьшая цена среди допущенных) и создаёт протокол"""
    result = await db.execute(
        select(Bid)
        .where(Bid.tender_id == tender_id, Bid.status == BidStatus.QUALIFIED)
        .order_by(Bid.price.asc())
    )
    qualified_bids = result.scalars().all()

    if not qualified_bids:
        raise HTTPException(status_code=400, detail="Нет допущенных заявок для формирования протокола")

    winner_bid = qualified_bids[0]
    winner_bid.status = BidStatus.WINNER

    protocol = Protocol(
        tender_id=tender_id,
        protocol_type="final",
        eds_hash=eds_hash,
        signed_by=current_user.id,
        is_published=True,
        published_at=datetime.utcnow(),
    )
    db.add(protocol)
    await db.flush()

    log = AuditLog(user_id=current_user.id, action="GENERATE_PROTOCOL", entity_type="protocol", entity_id=protocol.id)
    db.add(log)

    return {
        "message": "Протокол сформирован и опубликован",
        "winner": {"bid_id": winner_bid.id, "company_id": winner_bid.company_id, "price": winner_bid.price},
        "protocol_id": protocol.id,
    }
