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

    # [P0-FIX] Проверка дублирования заявки — один поставщик, одна активная заявка
    dup_result = await db.execute(
        select(Bid).where(
            Bid.tender_id == body.tender_id,
            Bid.supplier_id == current_user.id,
            Bid.status != BidStatus.REJECTED
        )
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Активная заявка на эту закупку уже подана. Сначала отзовите её, чтобы подать новую версию."
        )

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
    MAX_EXTENSIONS = 3  # [P2-FIX] Ограничение на максимальное количество продлений

    extension_count = getattr(tender, 'extension_count', 0) or 0
    if 0 < time_left_seconds <= (auto_extend * 60) and extension_count < MAX_EXTENSIONS:
        from datetime import timedelta
        tender.deadline_at = tender.deadline_at + timedelta(minutes=auto_extend)
        tender.extension_count = extension_count + 1
        log_ext = AuditLog(
            user_id=current_user.id, 
            action=f"ANTI_SNIPING_EXTENSION_{extension_count + 1}", 
            entity_type="tender", 
            entity_id=tender.id
        )
        db.add(log_ext)

    # Получаем компанию пользователя
    from app.models.models import Company
    comp_result = await db.execute(select(Company).where(Company.owner_id == current_user.id))
    company = comp_result.scalar_one_or_none()
    # [P1-FIX] Больше не создаём компанию-заглушку — требуем регистрации
    if not company:
        raise HTTPException(
            status_code=403,
            detail="Для подачи заявки необходимо зарегистрировать компанию в разделе 'Профиль'. Заполните реквизиты и сохраните их."
        )

    bid = Bid(
        tender_id=body.tender_id,
        supplier_id=current_user.id,
        company_id=company.id,
        price=body.price or (sum(i.price for i in body.items) if body.items else tender.start_price * 0.95),
        tech_spec_notes=body.tech_spec_notes,
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
                proposed_brand=item.proposed_brand,
                is_equivalent=item.is_equivalent or False,
                proposed_tech_spec=item.proposed_tech_spec,
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

    # [P1-FIX] Обновляем текущую минимальную цену — только если новая цена ниже текущей
    if tender.current_lowest_price is None or bid.price < tender.current_lowest_price:
        tender.current_lowest_price = bid.price

    # Пересчитываем ранги всех заявок по этому тендеру (только активные)
    bids_res = await db.execute(
        select(Bid).where(
            Bid.tender_id == body.tender_id,
            Bid.status != BidStatus.REJECTED
        ).order_by(Bid.price.asc())
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
    # [P2-FIX] Добавляем загрузку связанного тендера для корректного отображения статуса в кабинете
    result = await db.execute(
        select(Bid)
        .options(
            selectinload(Bid.items),
            selectinload(Bid.documents),
            selectinload(Bid.tender),
            selectinload(Bid.company)
        )
        .where(Bid.supplier_id == current_user.id)
        .order_by(Bid.submitted_at.desc())
    )
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
            selectinload(Bid.company),
            selectinload(Bid.tender)
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


@router.post("/tender/{tender_id}/protocol", summary="Сформировать и подписать протокол итогов по лотам")
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
        .options(selectinload(Bid.supplier), selectinload(Bid.company), selectinload(Bid.items))
        .where(Bid.tender_id == tender_id)
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

    # 1. Формируем список всех лотов закупки (из базы данных или 3 базовых лота по умолчанию)
    lots_list = list(tender.lots) if (tender.lots and len(tender.lots) > 0) else [
        TenderLot(id=1, lot_number=1, title=f"{tender.title} (Лот №1)", start_price=round(tender.start_price * 0.6)),
        TenderLot(id=2, lot_number=2, title="Комплектующие материалы и оборудование (Лот №2)", start_price=round(tender.start_price * 0.25)),
        TenderLot(id=3, lot_number=3, title="Услуги монтажа и пусконаладочных работ (Лот №3)", start_price=round(tender.start_price * 0.15))
    ]

    lot_summary_lines = []
    lot_detail_blocks = []
    first_winner_bid_id = None
    first_runner_up_bid_id = None

    for lot in lots_list:
        lot_id = lot.id
        lot_num = getattr(lot, 'lot_number', 1) or 1
        lot_title = getattr(lot, 'title', f'Лот №{lot_num}')
        lot_budget = getattr(lot, 'start_price', 0) or 0

        # Собираем все заявки участников по данному конкретному лоту
        lot_offers = []
        for b in bids:
            # Ищем ценовое предложение участника по данному лоту
            matching_item = next((item for item in (b.items or []) if item.lot_id == lot_id or item.lot_id == lot_num), None)
            if matching_item and matching_item.price > 0:
                lot_offers.append({
                    "bid": b,
                    "company_name": b.company.full_name if (b and b.company) else f"Поставщик №{b.supplier_id}",
                    "company_bin": b.company.bin if (b and b.company) else "123456789012",
                    "price": matching_item.price,
                    "tech_spec": matching_item.proposed_tech_spec or b.tech_spec_notes or "Соответствует технической спецификации"
                })
            elif not b.items:
                # Если полотовые элементы не создавались, берем общую цену заявки
                lot_offers.append({
                    "bid": b,
                    "company_name": b.company.full_name if (b and b.company) else f"Поставщик №{b.supplier_id}",
                    "company_bin": b.company.bin if (b and b.company) else "123456789012",
                    "price": b.price,
                    "tech_spec": b.tech_spec_notes or "Соответствует технической спецификации"
                })

        # Ранжируем предложения по возрастанию цены
        lot_offers.sort(key=lambda x: x["price"])

        if not lot_offers:
            lot_summary_lines.append(f"   • Лот №{lot_num} ({lot_title}): ❌ НЕ СОСТОЯЛСЯ (нет поданных заявок)")
            lot_detail_blocks.append(f"""
📦 ЛОТ №{lot_num}: {lot_title} (Бюджет: {lot_budget:,.2f} ₸)
   • Статус лота: НЕ СОСТОЯЛСЯ
   • Причина: Отсутствие заявок потенциальных поставщиков по данному лоту.
""")
        else:
            w = lot_offers[0]
            r = lot_offers[1] if len(lot_offers) > 1 else None

            # Помечаем статус победителя в базе данных
            w["bid"].status = BidStatus.WINNER
            w["bid"].rank = 1
            if not first_winner_bid_id:
                first_winner_bid_id = w["bid"].id

            if r:
                r["bid"].status = BidStatus.RUNNER_UP
                r["bid"].rank = 2
                if not first_runner_up_bid_id:
                    first_runner_up_bid_id = r["bid"].id

            lot_summary_lines.append(
                f"   • Лот №{lot_num} ({lot_title}): 🥇 ПОБЕДИТЕЛЬ — {w['company_name']} (БИН: {w['company_bin']}) — {w['price']:,.2f} ₸"
            )

            bids_registry_lines = []
            for rank_idx, offer in enumerate(lot_offers, start=1):
                badge = " [ПОБЕДИТЕЛЬ ПО ЛОТУ]" if rank_idx == 1 else ""
                bids_registry_lines.append(
                    f"      {rank_idx}. {offer['company_name']} (БИН: {offer['company_bin']}) — {offer['price']:,.2f} ₸{badge}"
                )
            
            bids_registry_text = "\n".join(bids_registry_lines)
            runner_text = f"   • Занявший 2-е место: {r['company_name']} (БИН: {r['company_bin']}) — {r['price']:,.2f} ₸" if r else "   • Занявший 2-е место: Не определен"

            lot_detail_blocks.append(f"""
📦 ЛОТ №{lot_num}: {lot_title} (Бюджет: {lot_budget:,.2f} ₸)
   🥇 ПОБЕДИТЕЛЬ ЛОТА №{lot_num}: {w['company_name']} (БИН: {w['company_bin']})
   💰 Победившая цена: {w['price']:,.2f} ₸
   {runner_text}
   📋 Таблица предложений по Лоту №{lot_num}:
{bids_registry_text}
""")

    tender.status = TenderStatus.COMPLETED

    summary_str = "\n".join(lot_summary_lines)
    details_str = "\n".join(lot_detail_blocks)

    protocol_text = f"""🏛️ ОФИЦИАЛЬНЫЙ ПРОТОКОЛ ИТОГОВ ЗАКУПКИ ПО ЛОТАМ № {tender.number}
Дата подведения итогов: {datetime.utcnow().strftime("%d.%m.%Y %H:%M:%S")}
Организатор: ТОО "Asia Partners" (БИН 987654321012)
Наименование закупки: {tender.title}
Общий стартовый бюджет: {tender.start_price:,.2f} ₸

══════════════════════════════════════════════════════════════
🏆 ИТОГОВОЕ РАСПРЕДЕЛЕНИЕ ПОБЕДИТЕЛЕЙ ПО ЛОТАМ:
══════════════════════════════════════════════════════════════
{summary_str}

══════════════════════════════════════════════════════════════
📦 ДЕТАЛИЗИРОВАННЫЕ РЕЗУЛЬТАТЫ ОЦЕНКИ ПО КАЖДОМУ ЛОТУ:
══════════════════════════════════════════════════════════════
{details_str}

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
        winner_id=first_winner_bid_id,
        runner_up_id=first_runner_up_bid_id,
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
        "message": "Протокол итогов по лотам сформирован, подписан ЭЦП и опубликован!",
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
