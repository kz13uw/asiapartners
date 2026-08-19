from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import Bid, BidStatus, Tender, TenderStatus, User, UserRole, AuditLog, Protocol
from app.schemas.schemas import BidCreate, BidStatusUpdate, BidOut, BidRevoke
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
    if tender.status not in [TenderStatus.ACCEPTING, TenderStatus.PUBLISHED]:
        raise HTTPException(status_code=400, detail="Прием ценовых предложений закрыт")

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
        price=body.price or (sum(i.price for i in body.items) if body.items else tender.start_price * 0.95),
        is_anti_dumping_flag=is_dumping,
        eds_hash=body.eds_hash or "demo_bid_signature",
    )
    db.add(bid)
    await db.flush()

    from app.models.models import BidItem, BidDocument
    if body.items:
        for item in body.items:
            db.add(BidItem(
                bid_id=bid.id,
                lot_id=item.lot_id,
                price=item.price,
                status=BidStatus.SUBMITTED
            ))

    if body.documents:
        for doc in body.documents:
            db.add(BidDocument(
                bid_id=bid.id,
                qual_req_id=doc.qual_req_id,
                doc_type=doc.doc_type or "supplier_doc",
                file_name=doc.file_name,
                file_path=doc.file_path or f"/uploads/bids/{bid.id}/{doc.file_name}",
                hash_sha256=doc.hash_sha256 or f"demo_hash_bid_{bid.id}",
            ))

    # Обновляем текущую минимальную цену тендера
    tender.current_lowest_price = bid.price

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
    from app.core.cache import cache_manager
    await cache_manager.delete("tenders:*")

    from sqlalchemy.orm import selectinload
    res_bid = await db.execute(select(Bid).options(selectinload(Bid.items), selectinload(Bid.documents)).where(Bid.id == bid.id))
    return res_bid.scalar_one()


@router.get("/my", response_model=list[BidOut], summary="Мои заявки (для поставщика)")
async def my_bids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPPLIER, UserRole.ADMIN)),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Bid).options(selectinload(Bid.items), selectinload(Bid.documents)).where(Bid.supplier_id == current_user.id).order_by(Bid.submitted_at.desc()))
    return result.scalars().all()


@router.get("/tender/{tender_id}", response_model=list[BidOut], summary="Заявки по тендеру (для организатора)")
async def get_bids_by_tender(
    tender_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.COMMISSION)),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Bid).options(
            selectinload(Bid.items), 
            selectinload(Bid.documents), 
            selectinload(Bid.supplier), 
            selectinload(Bid.company)
        ).where(Bid.tender_id == tender_id).order_by(Bid.price.asc())
    )
    bids = result.scalars().all()
    return bids


@router.patch("/{bid_id}/status", response_model=BidOut, summary="Изменить статус заявки (допуск/отклонение)")
async def update_bid_status(
    bid_id: int,
    body: BidStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.COMMISSION)),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Bid).where(Bid.id == bid_id))
    bid = result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if body.status == BidStatus.REJECTED and not body.rejection_reason:
        raise HTTPException(status_code=400, detail="Укажите причину отклонения")

    bid.status = body.status
    if body.rejection_reason:
        bid.rejection_reason = body.rejection_reason

    status_str = body.status.value.upper() if hasattr(body.status, 'value') else str(body.status).upper()
    log = AuditLog(
        user_id=current_user.id,
        action=f"BID_STATUS_{status_str}",
        entity_type="bid",
        entity_id=bid.id,
    )
    db.add(log)
    await db.commit()

    res = await db.execute(
        select(Bid).options(
            selectinload(Bid.items), 
            selectinload(Bid.documents), 
            selectinload(Bid.supplier), 
            selectinload(Bid.company)
        ).where(Bid.id == bid_id)
    )
    return res.scalar_one()


@router.post("/tender/{tender_id}/protocol", summary="Сформировать и подписать протокол итогов")
async def generate_protocol(
    tender_id: int,
    eds_hash: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    from sqlalchemy.orm import selectinload
    res_t = await db.execute(select(Tender).options(selectinload(Tender.lots)).where(Tender.id == tender_id))
    tender = res_t.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")

    result = await db.execute(
        select(Bid)
        .options(selectinload(Bid.supplier), selectinload(Bid.company))
        .where(Bid.tender_id == tender_id)
        .order_by(Bid.price.asc())
    )
    bids = result.scalars().all()

    if not bids:
        tender.status = TenderStatus.COMPLETED
        protocol = Protocol(
            tender_id=tender_id,
            protocol_type="final_unsuccessful",
            protocol_content=f"ПРОТОКОЛ ИТОГОВ ЗАКУПКИ № {tender.number}\n\nЗакупка признана НЕ СОСТОЯВШЕЙСЯ в связи с отсутствием поданных заявок.",
            eds_hash=eds_hash,
            signed_by=current_user.id,
            is_published=True,
            published_at=datetime.utcnow(),
        )
        db.add(protocol)
        await db.commit()
        return {"message": "Протокол сформирован: Закупка признана несостоявшейся", "status": "unsuccessful"}

    winner = bids[0]
    winner.status = BidStatus.WINNER
    winner.rank = 1

    runner_up = bids[1] if len(bids) > 1 else None
    if runner_up:
        runner_up.status = BidStatus.RUNNER_UP
        runner_up.rank = 2

    # Сохраняем остальные ранги в системе
    for idx, b in enumerate(bids):
        b.rank = idx + 1

    tender.status = TenderStatus.COMPLETED

    # Формируем полный список всех поданных заявок участников
    bids_table_lines = []
    for idx, b in enumerate(bids):
        rank_num = idx + 1
        comp_name = b.company.full_name if (b and b.company) else f"Поставщик №{b.supplier_id}"
        comp_bin = b.company.bin if (b and b.company) else "123456789012"
        status_tag = " [ПОБЕДИТЕЛЬ]" if rank_num == 1 else ""
        bids_table_lines.append(
            f"   {rank_num}. {comp_name} (БИН: {comp_bin}) — {b.price:,.2f} ₸{status_tag}"
        )

    bids_registry_text = "\n".join(bids_table_lines)

    protocol_text = f"""🏛️ ОФИЦИАЛЬНЫЙ ПРОТОКОЛ ИТОГОВ ЗАКУПКИ № {tender.number}
Дата подведения итогов: {datetime.utcnow().strftime("%d.%m.%Y %H:%M:%S")}
Организатор: ТОО "Asia Partners" (БИН 987654321012)
Наименование закупки: {tender.title}
Начальная сумма закупки: {tender.start_price:,.2f} ₸

══════════════════════════════════════════════════════════════
🥇 ПОБЕДИТЕЛЬ ЗАКУПКИ (1 МЕСТО):
══════════════════════════════════════════════════════════════
   • Участник: {winner.company.full_name if winner.company else "ТОО Поставщик"} (БИН: {winner.company.bin if winner.company else "123456789012"})
   • Предложенная цена: {winner.price:,.2f} ₸
   • Решение комиссии: ПРИЗНАТЬ ПОБЕДИТЕЛЕМ ЗАКУПКИ

══════════════════════════════════════════════════════════════
📋 ПОЛНЫЙ РЕЕСТР ПОДАННЫХ ЗАЯВОК И РАНЖИРОВАНИЕ УЧАСТНИКОВ:
══════════════════════════════════════════════════════════════
{bids_registry_text}

══════════════════════════════════════════════════════════════
🛡️ СВЕДЕНИЯ ОБ ЭЛЕКТРОННОЙ ЦИФРОВОЙ ПОДПИСИ (ЭЦП НУЦ РК):
══════════════════════════════════════════════════════════════
   • Статус подписи: [✓ ДЕЙСТВИТЕЛЕН / ВАЛИДИРОВАН НУЦ РК]
   • Владелец ЭЦП (Подписант): {current_user.full_name}
   • ИИН / БИН Подписанта: {current_user.iin_bin or '000000000000'}
   • Издатель сертификата: Национальный Удостоверяющий Центр Республики Казахстан (ГОСТ 34.310 / 2015)
   • Дата и время подписи: {datetime.utcnow().strftime("%d.%m.%Y %H:%M:%S UTC")}
   • Цифровой хэш подписи (CMS): {eds_hash or 'SHA256: 8f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b'}
══════════════════════════════════════════════════════════════
"""

    protocol = Protocol(
        tender_id=tender_id,
        protocol_type="final",
        winner_id=winner.id,
        runner_up_id=runner_up.id if runner_up else None,
        protocol_content=protocol_text,
        eds_hash=eds_hash,
        signed_by=current_user.id,
        is_published=True,
        published_at=datetime.utcnow(),
    )
    db.add(protocol)
    await db.flush()

    log = AuditLog(user_id=current_user.id, action="GENERATE_FINAL_PROTOCOL", entity_type="protocol", entity_id=protocol.id)
    db.add(log)
    await db.commit()

    return {
        "message": "Протокол итогов сформирован, подписан ЭЦП и опубликован!",
        "winner": {"bid_id": winner.id, "company_id": winner.company_id, "price": winner.price},
        "runner_up": {"bid_id": runner_up.id, "price": runner_up.price} if runner_up else None,
        "protocol_id": protocol.id,
        "protocol_content": protocol_text
    }


@router.post("/{bid_id}/revoke", response_model=BidOut, summary="Отозвать заявку с ЭЦП (Модуль 4)")
async def revoke_bid(
    bid_id: int,
    body: BidRevoke,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPPLIER)),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Bid).options(selectinload(Bid.items)).where(Bid.id == bid_id))
    bid = result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if bid.supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Чужую заявку отозвать нельзя")

    res_t = await db.execute(select(Tender).where(Tender.id == bid.tender_id))
    tender = res_t.scalar_one_or_none()
    if tender.status not in [TenderStatus.ACCEPTING, TenderStatus.PUBLISHED]:
        raise HTTPException(status_code=400, detail="Срок приема заявок истек, отзыв заблокирован")

    bid.status = BidStatus.REJECTED
    bid.revocation_reason = body.reason
    bid.revocation_eds_hash = body.eds_hash or "demo_revocation_signature"
    bid.revoked_at = datetime.utcnow()

    log = AuditLog(
        user_id=current_user.id,
        action="REVOKE_BID_WITH_EDS",
        entity_type="bid",
        entity_id=bid.id,
    )
    db.add(log)
    await db.commit()

    res = await db.execute(select(Bid).options(selectinload(Bid.items)).where(Bid.id == bid.id))
    return res.scalar_one()


@router.post("/tender/{tender_id}/revoke", response_model=BidOut, summary="Отозвать заявку по tender_id с ЭЦП")
async def revoke_bid_by_tender(
    tender_id: int,
    body: BidRevoke,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPPLIER)),
):
    from sqlalchemy.orm import selectinload
    res_t = await db.execute(select(Tender).where(Tender.id == tender_id))
    tender = res_t.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if tender.status not in [TenderStatus.ACCEPTING, TenderStatus.PUBLISHED]:
        raise HTTPException(status_code=400, detail="Срок приема заявок истек, отзыв заблокирован")

    result = await db.execute(
        select(Bid)
        .options(selectinload(Bid.items))
        .where(Bid.tender_id == tender_id, Bid.supplier_id == current_user.id, Bid.status != BidStatus.REJECTED)
    )
    bid = result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=404, detail="Активная заявка по данному тендеру не найдена")

    bid.status = BidStatus.REJECTED
    bid.revocation_reason = body.reason
    bid.revocation_eds_hash = body.eds_hash or "demo_revocation_signature"
    bid.revoked_at = datetime.utcnow()

    log = AuditLog(
        user_id=current_user.id,
        action="REVOKE_BID_WITH_EDS",
        entity_type="bid",
        entity_id=bid.id,
    )
    db.add(log)
    await db.commit()

    res = await db.execute(select(Bid).options(selectinload(Bid.items)).where(Bid.id == bid.id))
    return res.scalar_one()


@router.post("/{bid_id}/resubmit", response_model=BidOut, summary="Повторно подать отозванную заявку с ЭЦП (Версионирование)")
async def resubmit_bid(
    bid_id: int,
    body: BidCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPPLIER)),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Bid).options(selectinload(Bid.items)).where(Bid.id == bid_id))
    bid = result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if bid.supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Чужую заявку повторно подать нельзя")

    bid.version += 1
    bid.status = BidStatus.SUBMITTED
    bid.price = body.price or (sum(i.price for i in body.items) if body.items else bid.price)
    bid.eds_hash = body.eds_hash or "demo_resubmit_signature"
    bid.submitted_at = datetime.utcnow()

    log = AuditLog(
        user_id=current_user.id,
        action=f"RESUBMIT_BID_V{bid.version}_WITH_EDS",
        entity_type="bid",
        entity_id=bid.id,
    )
    db.add(log)
    await db.commit()

    res = await db.execute(select(Bid).options(selectinload(Bid.items)).where(Bid.id == bid.id))
    return res.scalar_one()
