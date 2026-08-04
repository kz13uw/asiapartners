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


@router.post("", response_model=BidOut, status_code=201, summary="Подать заявку / ставку на понижение")
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
    if tender.status not in [TenderStatus.ACCEPTING, TenderStatus.AUCTION, TenderStatus.PUBLISHED]:
        raise HTTPException(status_code=400, detail="Прием заявок/торги закрыты")

    # Проверяем шаг цены
    if body.price >= tender.start_price:
        raise HTTPException(
            status_code=400, 
            detail=f"Цена ценового предложения должна быть ниже стартовой суммы ({tender.start_price:,.0f} ₸)"
        )

    # Проверка на антидемпинг
    dumping_threshold = tender.start_price * (1 - (tender.anti_dumping_pct or 20.0) / 100.0)
    is_dumping = body.price < dumping_threshold

    # Проверка на Anti-Sniping (автопродление при ставке в последние 5 минут)
    now = datetime.utcnow()
    time_left_seconds = (tender.deadline_at - now).total_seconds()
    auto_extend = tender.auto_extend_minutes or 5

    if 0 < time_left_seconds <= (auto_extend * 60):
        from datetime import timedelta
        tender.deadline_at = tender.deadline_at + timedelta(minutes=auto_extend)
        log_ext = AuditLog(
            user_id=current_user.id, 
            action="ANTI_SNIPING_EXTENSION", 
            entity_type="tender", 
            entity_id=tender.id
        )
        db.add(log_ext)

    # Получаем компанию пользователя
    from app.models.models import Company
    comp_result = await db.execute(select(Company).where(Company.owner_id == current_user.id))
    company = comp_result.scalar_one_or_none()
    if not company:
        # Создаем временную компанию для тестирования, если не создана
        company = Company(
            bin=current_user.iin_bin or "123456789012",
            full_name=f"ТОО {current_user.full_name}",
            legal_form="ТОО",
            is_accredited=True,
            owner_id=current_user.id
        )
        db.add(company)
        await db.flush()

    bid = Bid(
        tender_id=body.tender_id,
        supplier_id=current_user.id,
        company_id=company.id,
        price=body.price,
        is_anti_dumping_flag=is_dumping,
        eds_hash=body.eds_hash,
    )
    db.add(bid)
    await db.flush()

    # Обновляем текущую минимальную цену тендера
    tender.current_lowest_price = body.price

    # Пересчитываем ранги всех заявок по этому тендеру
    bids_res = await db.execute(
        select(Bid).where(Bid.tender_id == body.tender_id).order_by(Bid.price.asc())
    )
    all_bids = bids_res.scalars().all()
    for idx, b in enumerate(all_bids, start=1):
        b.rank = idx
        if idx == 1:
            b.status = BidStatus.QUALIFIED
        elif idx == 2:
            b.status = BidStatus.RUNNER_UP

    log = AuditLog(user_id=current_user.id, action="SUBMIT_BID", entity_type="bid", entity_id=bid.id)
    db.add(log)
    await db.commit()
    await db.refresh(bid)
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
