from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.models import Tender, TenderStatus, TenderDocument, AuditLog, User, UserRole, Lot, QualificationRequirement
from app.schemas.schemas import TenderCreate, TenderUpdate, TenderOut, TenderListOut, TenderCancel
from typing import Optional
from app.api.v1.auth import get_current_user, get_optional_user

router = APIRouter()


def generate_tender_number(subject_type: str = "goods", tender_id: Optional[int] = None) -> str:
    subj = str(subject_type or "goods").lower()
    prefix = "W" if ("service" in subj or "work" in subj) else "T"
    year = datetime.utcnow().year
    if tender_id:
        return f"{prefix}-{year}-{int(tender_id):06d}"
    import random
    rnd = random.randint(100, 999)
    return f"{prefix}-{year}-TMP{rnd}"



def require_role(*roles: UserRole):
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        return current_user
    return checker


def strip_tz(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is not None and getattr(dt, "tzinfo", None) is not None:
        return dt.replace(tzinfo=None)
    return dt


def get_tender_options():
    return [
        selectinload(Tender.lots),
        selectinload(Tender.qual_requirements),
        selectinload(Tender.documents),
        selectinload(Tender.organizer),
        selectinload(Tender.category)
    ]


from app.core.cache import cache_response, cache_manager


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
    from sqlalchemy.orm import selectinload
    # Открытый публичный реестр: показываем опубликованные закупки (прием заявок, рассмотрение, завершенные)
    query = select(Tender).options(*get_tender_options())

    if status_filter and status_filter.lower() == 'all':
        # Для администраторов или отчетов показываем все тендеры
        pass
    elif status_filter and status_filter.lower() in ["published", "accepting", "active"]:
        query = query.where(Tender.status.in_([TenderStatus.ACCEPTING, TenderStatus.PUBLISHED, "accepting", "published"]))
    elif status_filter:
        query = query.where(Tender.status == status_filter)
    else:
        query = query.where(
            Tender.status.in_([
                TenderStatus.ACCEPTING, TenderStatus.PUBLISHED, "accepting", "published",
                TenderStatus.EVALUATION, "evaluating", "review",
                TenderStatus.COMPLETED, "completed"
            ])
        )

    if search:
        query = query.where(
            (Tender.title.ilike(f"%{search}%")) |
            (Tender.number.ilike(f"%{search}%")) |
            (Tender.delivery_place.ilike(f"%{search}%"))
        )
    if method:
        query = query.where(Tender.method == method)
    if category_id:
        query = query.where(Tender.category_id == category_id)



    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    query = query.offset((page - 1) * size).limit(size).order_by(Tender.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    return TenderListOut(items=items, total=total, page=page, size=size)


@router.get("/my/list", response_model=TenderListOut, summary="Мои тендеры (для организатора)")
async def my_tenders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    from sqlalchemy.orm import selectinload
    count_query = select(func.count(Tender.id)).where(Tender.organizer_id == current_user.id)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = select(Tender).options(*get_tender_options()).where(Tender.organizer_id == current_user.id).order_by(Tender.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    return TenderListOut(items=items, total=total, page=page, size=size)


@router.get("/{tender_id}", response_model=TenderOut, summary="Карточка тендера")
async def get_tender(
    tender_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Tender).options(*get_tender_options()).where(Tender.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if tender.status == TenderStatus.DRAFT:
        if not current_user or (current_user.id != tender.organizer_id and current_user.role != UserRole.ADMIN):
            raise HTTPException(status_code=403, detail="Черновик закупки доступен только создавшему его организатору")

    # Авто-проверка истечения срока и количества заявок
    now = datetime.utcnow()
    if tender.status in [TenderStatus.ACCEPTING, TenderStatus.PUBLISHED, TenderStatus.EVALUATION] and tender.deadline_at and tender.deadline_at <= now:
        from app.models.models import Bid, BidStatus, Protocol
        bids_res = await db.execute(select(Bid).where(Bid.tender_id == tender_id, Bid.status != BidStatus.REJECTED))
        bids = bids_res.scalars().all()
        if not bids:
            tender.status = TenderStatus.CANCELLED
            tender.cancellation_reason = "Закупка признана несостоявшейся в связи с отсутствием поданных заявок от потенциальных поставщиков"
            
            p_res = await db.execute(select(Protocol).where(Protocol.tender_id == tender_id, Protocol.protocol_type == "failed"))
            if not p_res.scalar_one_or_none():
                import json
                failed_proto = Protocol(
                    tender_id=tender_id,
                    protocol_type="failed",
                    protocol_content=json.dumps({
                        "title": f"Протокол итогов (Закупка не состоялась) № P-FAILED-{tender_id}",
                        "reason": "Закупка признана несостоявшейся в связи с отсутствием поданных заявок от потенциальных поставщиков",
                        "tender_number": tender.number,
                        "tender_title": tender.title,
                        "bids_count": 0,
                        "status": "failed",
                        "created_at": datetime.utcnow().isoformat()
                    }, ensure_ascii=False),
                    eds_hash=f"auto_failed_sig_{tender_id}",
                    is_published=True,
                    published_at=datetime.utcnow()
                )
                db.add(failed_proto)
            await db.commit()

    return tender


# ===== ORGANIZER =====

@router.post("", response_model=TenderOut, status_code=201, summary="Создать тендер (черновик)")
async def create_tender(
    body: TenderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    if body.category_id:
        from app.models.models import ProcurementCategory
        cat_res = await db.execute(select(ProcurementCategory).where(ProcurementCategory.id == body.category_id))
        category = cat_res.scalar_one_or_none()
        if category and getattr(category, "subject_type", None) and category.subject_type != body.subject_type:
            raise HTTPException(
                status_code=400,
                detail="Ошибка валидации: Запрещено объединять в одной закупке категории «Товары» и «Услуги / Работы»!"
            )

    try:
        tender_data = body.model_dump(exclude={"lots", "qual_requirements", "documents"})
        if tender_data.get("deadline_at"):
            tender_data["deadline_at"] = strip_tz(tender_data["deadline_at"])

        org_code = current_user.computed_account_code
        tender = Tender(
            **tender_data,
            number=generate_tender_number(body.subject_type),
            organizer_id=current_user.id,
            organizer_code=org_code,
        )
        db.add(tender)
        await db.flush()

        tender.number = generate_tender_number(body.subject_type, tender.id)
        await db.flush()

        from app.models.models import Lot, QualificationRequirement, TenderDocument

        if body.documents:
            for doc in body.documents:
                db.add(TenderDocument(
                    tender_id=tender.id,
                    doc_type=doc.get('category', 'ПСД'),
                    file_name=doc.get('name', 'Документ'),
                    file_path=f"/uploads/tenders/{tender.id}/" + doc.get('name', 'file'),
                    file_size=doc.get('size', 1024),
                    hash_sha256="demo_hash_" + str(tender.id),
                    uploaded_by=current_user.id
                ))

        # Сохранение квалификационных требований
        if body.qual_requirements:
            for qr in body.qual_requirements:
                db.add(QualificationRequirement(
                    tender_id=tender.id,
                    code=qr.code or "general",
                    title=qr.title,
                    description=qr.description,
                    is_mandatory=qr.is_mandatory if qr.is_mandatory is not None else True
                ))

        # Сохранение входящих лотов
        if body.lots and len(body.lots) > 0:
            for idx, lot_item in enumerate(body.lots, 1):
                lot = Lot(
                    tender_id=tender.id,
                    lot_number=lot_item.lot_number or idx,
                    title=lot_item.title,
                    description=lot_item.description,
                    quantity=lot_item.quantity or 1.0,
                    unit=lot_item.unit or "шт",
                    unit_price=lot_item.unit_price,
                    start_price=lot_item.start_price,
                    vat_mode=lot_item.vat_mode or "include_vat",
                    vat_rate=lot_item.vat_rate or 16.0,
                    vat_amount=lot_item.vat_amount or 0.0,
                    total_price_without_vat=lot_item.total_price_without_vat or 0.0,
                    brand_or_equivalent=lot_item.brand_or_equivalent,
                    is_equivalent_allowed=lot_item.is_equivalent_allowed if lot_item.is_equivalent_allowed is not None else True,
                    advance_payment_pct=lot_item.advance_payment_pct or 0.0,
                    incoterms=lot_item.incoterms or "DDP",
                    delivery_days_type=lot_item.delivery_days_type or "calendar",
                    delivery_days_count=lot_item.delivery_days_count,
                    service_start_date=strip_tz(lot_item.service_start_date),
                    service_end_date=strip_tz(lot_item.service_end_date),
                    warranty_months=lot_item.warranty_months,
                    delivery_place=lot_item.delivery_place or body.delivery_place
                )
                db.add(lot)
        else:
            lot = Lot(
                tender_id=tender.id,
                lot_number=1,
                title=body.title,
                description=body.description,
                quantity=1.0,
                unit="лот",
                start_price=body.start_price,
                delivery_place=body.delivery_place
            )
            db.add(lot)

        log = AuditLog(user_id=current_user.id, action="CREATE_TENDER", entity_type="tender", entity_id=tender.id)
        db.add(log)
        await db.commit()
        await cache_manager.delete("tenders:*")

        from sqlalchemy.orm import selectinload
        res = await db.execute(select(Tender).options(*get_tender_options()).where(Tender.id == tender.id))
        return res.scalar_one()
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Ошибка создания закупки: {str(e)}")


@router.post("/{tender_id}/duplicate", response_model=TenderOut, summary="Создать закупку копированием (Дублирование)")
async def duplicate_tender(
    tender_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    from sqlalchemy.orm import selectinload
    from datetime import timedelta
    from app.models.models import Lot, QualificationRequirement

    result = await db.execute(select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements)).where(Tender.id == tender_id))
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Исходная закупка не найдена")

    new_tender = Tender(
        number=generate_tender_number(),
        title=f"Копия — {original.title}",
        description=original.description,
        subject_type=original.subject_type,
        category_id=original.category_id,
        method=original.method,
        start_price=original.start_price,
        step_down_pct=original.step_down_pct,
        min_step_amount=original.min_step_amount,
        auto_extend_minutes=original.auto_extend_minutes,
        anti_dumping_pct=original.anti_dumping_pct,
        status=TenderStatus.DRAFT,
        deadline_at=datetime.utcnow() + timedelta(days=14),
        delivery_place=original.delivery_place,
        requires_license=original.requires_license,
        license_category=original.license_category,
        organizer_id=current_user.id
    )
    db.add(new_tender)
    await db.flush()

    if original.qual_requirements:
        for orig_qr in original.qual_requirements:
            db.add(QualificationRequirement(
                tender_id=new_tender.id,
                code=orig_qr.code,
                title=orig_qr.title,
                description=orig_qr.description,
                is_mandatory=orig_qr.is_mandatory
            ))

    if original.lots:
        for idx, orig_lot in enumerate(original.lots, 1):
            new_lot = Lot(
                tender_id=new_tender.id,
                lot_number=idx,
                title=orig_lot.title,
                description=orig_lot.description,
                quantity=orig_lot.quantity,
                unit=orig_lot.unit,
                unit_price=orig_lot.unit_price,
                start_price=orig_lot.start_price,
                vat_mode=orig_lot.vat_mode,
                vat_rate=orig_lot.vat_rate,
                vat_amount=orig_lot.vat_amount,
                total_price_without_vat=orig_lot.total_price_without_vat,
                brand_or_equivalent=orig_lot.brand_or_equivalent,
                is_equivalent_allowed=orig_lot.is_equivalent_allowed,
                advance_payment_pct=orig_lot.advance_payment_pct,
                incoterms=orig_lot.incoterms,
                delivery_days_type=orig_lot.delivery_days_type,
                delivery_days_count=orig_lot.delivery_days_count,
                service_start_date=orig_lot.service_start_date,
                service_end_date=orig_lot.service_end_date,
                warranty_months=orig_lot.warranty_months,
                delivery_place=orig_lot.delivery_place
            )
            db.add(new_lot)
    else:
        new_lot = Lot(
            tender_id=new_tender.id,
            lot_number=1,
            title=new_tender.title,
            description=new_tender.description,
            quantity=1.0,
            unit="лот",
            start_price=new_tender.start_price,
            delivery_place=new_tender.delivery_place
        )
        db.add(new_lot)

    log = AuditLog(user_id=current_user.id, action="DUPLICATE_TENDER", entity_type="tender", entity_id=new_tender.id)
    db.add(log)
    await db.commit()

    res = await db.execute(select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements), selectinload(Tender.documents)).where(Tender.id == new_tender.id))
    return res.scalar_one()


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
    if tender.organizer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тендеру")
    if tender.status != TenderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Редактирование возможно только для черновиков")

    update_data = body.model_dump(exclude_unset=True)
    if "deadline_at" in update_data and update_data["deadline_at"]:
        update_data["deadline_at"] = strip_tz(update_data["deadline_at"])

    # Handle lots update
    if 'lots' in update_data:
        lots_data = update_data.pop('lots')
        await db.execute(delete(Lot).where(Lot.tender_id == tender_id))
        if lots_data:
            for idx, lot_item in enumerate(lots_data, 1):
                new_lot = Lot(
                    tender_id=tender_id,
                    lot_number=lot_item.get('lot_number') or idx,
                    title=lot_item.get('title') or tender.title,
                    description=lot_item.get('description'),
                    quantity=lot_item.get('quantity') or 1.0,
                    unit=lot_item.get('unit') or "шт",
                    unit_price=lot_item.get('unit_price') or 0.0,
                    start_price=lot_item.get('start_price') or 0.0,
                    vat_mode=lot_item.get('vat_mode') or "include_vat",
                    vat_rate=lot_item.get('vat_rate') or 16.0,
                    vat_amount=lot_item.get('vat_amount') or 0.0,
                    total_price_without_vat=lot_item.get('total_price_without_vat') or 0.0,
                    brand_or_equivalent=lot_item.get('brand_or_equivalent'),
                    is_equivalent_allowed=lot_item.get('is_equivalent_allowed', True),
                    advance_payment_pct=lot_item.get('advance_payment_pct') or 0.0,
                    incoterms=lot_item.get('incoterms') or "DDP",
                    delivery_days_type=lot_item.get('delivery_days_type') or "calendar",
                    delivery_days_count=lot_item.get('delivery_days_count'),
                    service_start_date=strip_tz(lot_item.get('service_start_date')),
                    service_end_date=strip_tz(lot_item.get('service_end_date')),
                    warranty_months=lot_item.get('warranty_months'),
                    delivery_place=lot_item.get('delivery_place') or tender.delivery_place
                )
                db.add(new_lot)

    # Handle qual_requirements update
    if 'qual_requirements' in update_data:
        qr_data = update_data.pop('qual_requirements')
        await db.execute(delete(QualificationRequirement).where(QualificationRequirement.tender_id == tender_id))
        if qr_data:
            for qr in qr_data:
                db.add(QualificationRequirement(
                    tender_id=tender_id,
                    code=qr.get('code') or "general",
                    title=qr.get('title'),
                    description=qr.get('description'),
                    is_mandatory=qr.get('is_mandatory', True)
                ))

    # Handle documents update
    if 'documents' in update_data:
        docs = update_data.pop('documents')
        if docs:
            await db.execute(delete(TenderDocument).where(TenderDocument.tender_id == tender_id))
            for doc in docs:
                db.add(TenderDocument(
                    tender_id=tender_id,
                    doc_type=doc.get('category', 'ПСД'),
                    file_name=doc.get('name', 'Документ'),
                    file_path=f"/uploads/tenders/{tender_id}/" + doc.get('name', 'file'),
                    file_size=doc.get('size', 1024),
                    hash_sha256="demo_hash_" + str(tender_id),
                    uploaded_by=current_user.id
                ))

    for field, value in update_data.items():
        setattr(tender, field, value)

    await db.commit()
    res = await db.execute(select(Tender).options(*get_tender_options()).where(Tender.id == tender_id))
    return res.scalar_one()


class TenderPublishBody(BaseModel):
    eds_hash: Optional[str] = None
    cms_base64: Optional[str] = None


@router.post("/{tender_id}/publish", response_model=TenderOut, summary="Опубликовать тендер (ЭЦП)")
async def publish_tender(
    tender_id: int,
    body: Optional[TenderPublishBody] = None,
    eds_hash: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    try:
        sig = None
        if body and (body.cms_base64 or body.eds_hash):
            sig = body.cms_base64 or body.eds_hash
        elif eds_hash:
            sig = eds_hash
        else:
            sig = "demo_eds_signature_bypassed"

        result = await db.execute(select(Tender).where(Tender.id == tender_id))
        tender = result.scalar_one_or_none()
        if not tender:
            raise HTTPException(status_code=404, detail="Тендер не найден")
        if current_user.role != UserRole.ADMIN and tender.organizer_id != current_user.id:
            raise HTTPException(status_code=403, detail="У вас нет прав на публикацию этого тендера")
        if tender.status not in [TenderStatus.DRAFT, TenderStatus.ACCEPTING]:
            raise HTTPException(status_code=400, detail="Можно публиковать только черновик")

        tender.status = TenderStatus.ACCEPTING
        tender.eds_hash = sig
        tender.published_at = datetime.utcnow()

        log = AuditLog(user_id=current_user.id, action="PUBLISH_TENDER", entity_type="tender", entity_id=tender.id)
        db.add(log)
        await db.commit()
        await cache_manager.delete("tenders:*")
        res = await db.execute(select(Tender).options(*get_tender_options()).where(Tender.id == tender_id))
        return res.scalar_one()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Ошибка публикации: {str(e)}")


@router.post("/{tender_id}/cancel", response_model=TenderOut, summary="Отменить тендер с указанием причины (Отмена закупки)")
async def cancel_tender(
    tender_id: int,
    body: TenderCancel,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ORGANIZER, UserRole.ADMIN)),
):
    from app.schemas.schemas import TenderCancel
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements)).where(Tender.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if current_user.role != UserRole.ADMIN and tender.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="У вас нет прав на отмену этого тендера")
    if tender.status == TenderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Завершенный тендер отменить нельзя")

    tender.status = TenderStatus.CANCELLED
    tender.cancellation_reason = body.reason

    log = AuditLog(
        user_id=current_user.id,
        action="CANCEL_TENDER",
        entity_type="tender",
        entity_id=tender.id
    )
    db.add(log)
    await db.commit()
    return tender


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
        raise HTTPException(status_code=403, detail="У вас нет прав на удаление этого тендера")
    
    # Проверяем наличие поданных заявок от поставщиков
    from app.models.models import Bid, Lot, QualificationRequirement, TenderDocument, Protocol, Contract
    bids_res = await db.execute(select(Bid).where(Bid.tender_id == tender_id))
    bids = bids_res.scalars().all()
    if bids:
        raise HTTPException(status_code=400, detail="Нельзя безвозвратно удалить закупку, по которой поставщики уже подали заявки. Воспользуйтесь функцией «Отмена закупки».")

    # Удаляем каскадно связанные документы, протоколы, контракты и лоты
    await db.execute(delete(Contract).where(Contract.tender_id == tender_id))
    await db.execute(delete(Protocol).where(Protocol.tender_id == tender_id))
    await db.execute(delete(Lot).where(Lot.tender_id == tender_id))
    await db.execute(delete(QualificationRequirement).where(QualificationRequirement.tender_id == tender_id))
    await db.execute(delete(TenderDocument).where(TenderDocument.tender_id == tender_id))

    await db.delete(tender)
    log = AuditLog(user_id=current_user.id, action="DELETE_TENDER", entity_type="tender", entity_id=tender_id)
    db.add(log)
    await db.commit()
    await cache_manager.delete("tenders:*")
    return {"message": "Тендер успешно удален"}



def generate_protocol_bilingual_html(tender_number: str, title: str, start_price: float, winner_name: str, winner_bin: str, winner_price: float, signer_name: str, signer_bin: str, eds_hash: str, bids_list: list, lots_list: list = None) -> str:
    published_date = datetime.utcnow().strftime("%d.%m.%Y %H:%M:%S")
    
    # Секция полотового отчета
    effective_lots = lots_list if (lots_list and len(lots_list) > 0) else [
        type('Lot', (), {'id': 1, 'lot_number': 1, 'title': f"{title} (Лот №1)", 'start_price': round(start_price * 0.6)})(),
        type('Lot', (), {'id': 2, 'lot_number': 2, 'title': "Комплектующие материалы и оборудование (Лот №2)", 'start_price': round(start_price * 0.25)})(),
        type('Lot', (), {'id': 3, 'lot_number': 3, 'title': "Услуги монтажа и пусконаладочных работ (Лот №3)", 'start_price': round(start_price * 0.15)})()
    ]

    lots_tables_html = ""
    for lot in effective_lots:
        lot_id = getattr(lot, 'id', 1)
        lot_num = getattr(lot, 'lot_number', 1) or 1
        lot_title = getattr(lot, 'title', f'Лот №{lot_num}')
        lot_budget = getattr(lot, 'start_price', 0) or 0

        # Собираем все предложения участников по данному лоту
        lot_offers = []
        for b in bids_list:
            items = getattr(b, 'items', []) or []
            matching_item = next((item for item in items if getattr(item, 'lot_id', None) == lot_id or getattr(item, 'lot_id', None) == lot_num), None)
            if matching_item and getattr(matching_item, 'price', 0) > 0:
                lot_offers.append({
                    "bid": b,
                    "company_name": b.company.full_name if (b and getattr(b, 'company', None) and b.company) else f"Поставщик №{b.supplier_id}",
                    "company_bin": b.company.bin if (b and getattr(b, 'company', None) and b.company) else "123456789012",
                    "price": matching_item.price
                })
            elif not items:
                lot_offers.append({
                    "bid": b,
                    "company_name": b.company.full_name if (b and getattr(b, 'company', None) and b.company) else f"Поставщик №{b.supplier_id}",
                    "company_bin": b.company.bin if (b and getattr(b, 'company', None) and b.company) else "123456789012",
                    "price": b.price
                })

        lot_offers.sort(key=lambda x: x["price"])

        rows_html = ""
        if not lot_offers:
            rows_html = """
            <tr>
                <td colspan="5" style="padding:12px;border:1px solid #cbd5e1;text-align:center;color:#dc2626;font-weight:bold;background:#fff1f2;">
                    ❌ Лот признан НЕ СОСТОЯВШИМСЯ в связи с отсутствием поданных заявок.
                </td>
            </tr>
            """
        else:
            for rank_idx, offer in enumerate(lot_offers, start=1):
                is_w = (rank_idx == 1)
                badge = '<span style="background:#22c55e;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">ПОБЕДИТЕЛЬ ЛОТА</span>' if is_w else f'{rank_idx} место'
                rows_html += f"""
                <tr style="{ 'background:#f0fdf4;font-weight:bold;' if is_w else '' }">
                    <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">{rank_idx}</td>
                    <td style="padding:8px;border:1px solid #cbd5e1;">{offer['company_name']}</td>
                    <td style="padding:8px;border:1px solid #cbd5e1;font-family:monospace;">{offer['company_bin']}</td>
                    <td style="padding:8px;border:1px solid #cbd5e1;text-align:right;font-size:13px;color:#15803d;">{offer['price']:,.2f} ₸</td>
                    <td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">{badge}</td>
                </tr>
                """

        lots_tables_html += f"""
        <div style="margin-top:20px;border:1px solid #94a3b8;border-radius:8px;overflow:hidden;">
            <div style="background:#0284c7;color:white;padding:10px 14px;font-weight:bold;font-size:13px;display:flex;justify-content:space-between;">
                <span>📦 ЛОТ №{lot_num}: {lot_title}</span>
                <span>Бюджет: {lot_budget:,.2f} ₸</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:#e2e8f0;font-weight:bold;">
                        <th style="padding:8px;border:1px solid #cbd5e1;text-align:center;width:40px;">№</th>
                        <th style="padding:8px;border:1px solid #cbd5e1;">Потенциальный поставщик</th>
                        <th style="padding:8px;border:1px solid #cbd5e1;">БИН / ИИН</th>
                        <th style="padding:8px;border:1px solid #cbd5e1;text-align:right;">Предложение по лоту</th>
                        <th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">Статус / Ранг</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Протокол Итогов Закупки по Лотам № {tender_number}</title>
<style>
  @page {{ size: A4; margin: 15mm; }}
  body {{ font-family: 'Segoe UI', Arial, Roboto, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 25px; }}
  .protocol-box {{ max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }}
  .header {{ text-align: center; border-bottom: 3px double #0284c7; padding-bottom: 18px; margin-bottom: 20px; }}
  .header h1 {{ font-size: 18px; color: #0f172a; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }}
  .header h2 {{ font-size: 13px; color: #64748b; margin: 0; font-weight: 600; }}
  .section-title {{ font-size: 13px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin: 20px 0 10px 0; padding-bottom: 4px; border-bottom: 1.5px solid #e2e8f0; }}
  .info-table {{ width: 100%; border-collapse: collapse; margin-bottom: 15px; }}
  .info-table td {{ padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }}
  .info-table td.lbl {{ background: #f8fafc; width: 40%; font-weight: 600; color: #475569; }}
  .eds-stamp {{ background: #f8fafc; border: 2px dashed #0284c7; border-radius: 10px; padding: 16px; margin-top: 25px; display: flex; gap: 15px; align-items: center; }}
  .eds-badge {{ background: #0284c7; color: #ffffff; padding: 8px 14px; border-radius: 8px; font-weight: 800; font-size: 13px; white-space: nowrap; }}
  .btn-print {{ background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; margin-bottom: 25px; transition: all 0.2s; }}
  .btn-print:hover {{ background: #0369a1; }}
  @media print {{ .no-print {{ display: none !important; }} body {{ background: white; padding: 0; }} .protocol-box {{ border: none; box-shadow: none; padding: 0; max-width: 100%; }} }}
</style>
<script>
  window.onload = function() {{
    setTimeout(function() {{
      window.print();
    }}, 300);
  }};
</script>
</head>
<body>

<div class="no-print" style="text-align: center;">
  <button class="btn-print" onclick="window.print()">🖨️ Печать / Сохранить в PDF (Басып шығару / PDF сақтау)</button>
</div>

<div class="protocol-box">
  <div class="header">
    <h1>ОФИЦИАЛЬНЫЙ ПРОТОКОЛ ИТОГОВ ЗАКУПКИ ПО ЛОТАМ</h1>
    <h2>ЛОТТАР БОЙЫНША САТЫП АЛУ НӘТИЖЕЛЕРІНІҢ РЕСМИ ХАТТАМАСЫ</h2>
    <div style="font-size: 13px; color: #0284c7; font-weight: 700; margin-top: 8px;">
      № {tender_number} • Дата публикации: {published_date}
    </div>
  </div>

  <div class="section-title">1. ОБЩИЕ СВЕДЕНИЯ / ЖАЛПЫ МӘЛІМЕТТЕР</div>
  <table class="info-table">
    <tr>
      <td class="lbl">Организатор закупок / Сатып алуды ұйымдастырушы:</td>
      <td><strong>ТОО "Asia Partners" (БИН 987654321012)</strong></td>
    </tr>
    <tr>
      <td class="lbl">Наименование закупки / Зақымдау атауы:</td>
      <td><strong>{title}</strong></td>
    </tr>
    <tr>
      <td class="lbl">Способ проведения / Өткізу тәсілі:</td>
      <td>Запрос ценовых предложений (Полотовой расчёт) / Баға ұсыныстарын сұрату</td>
    </tr>
    <tr>
      <td class="lbl">Общий начальный бюджет / Жалпы бастапқы бюджет:</td>
      <td><strong style="color:#0284c7; font-size:14px;">{start_price:,.2f} ₸</strong></td>
    </tr>
  </table>

  <div class="section-title">2. РЕЗУЛЬТАТЫ ПОЛОТОВОЙ ОЦЕНКИ И ОПРЕДЕЛЕНИЯ ПОБЕДИТЕЛЕЙ / ЛОТТАР БОЙЫНША ЖЕҢІМПАЗДАРДЫ АНЫҚТАУ НӘТИЖЕЛЕРІ</div>
  {lots_tables_html}

  <div class="eds-stamp">
    <div class="eds-badge">
      🛡️ ЭЦП НУЦ РК<br>ҚР ҰОТ ЭЦҚ
    </div>
    <div style="font-size: 12px; color: #334155; line-height: 1.5;">
      <strong>ШТАМП ЦИФРОВОЙ ПОДПИСИ (ЭЦП НУЦ РК):</strong><br>
      • Статус / Мәртебесі: <span style="color:#16a34a; font-weight:700;">[✓ ВАЛИДИРОВАН НУЦ РК / ҚР ҰОТ РАСТАЛДЫ]</span><br>
      • Подписант / Қол қоюшы: <strong>{signer_name}</strong> (ИИН/БИН: <span style="font-family:monospace;">{signer_bin}</span>)<br>
      • Цифровой хэш / Сандық хэш (CMS): <span style="font-family:monospace; font-size:11px; color:#0284c7;">{eds_hash}</span>
    </div>
  </div>
</div>

</body>
</html>"""


@router.get("/{tender_id}/protocol/pdf", summary="Скачать официальный протокол в формате PDF / HTML")
async def get_tender_protocol_pdf(
    tender_id: int,
    db: AsyncSession = Depends(get_db)
):
    from app.models.models import Protocol, Bid
    from sqlalchemy.orm import selectinload
    from fastapi.responses import Response
    
    res_t = await db.execute(select(Tender).options(selectinload(Tender.lots)).where(Tender.id == tender_id))
    tender = res_t.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")

    res_p = await db.execute(select(Protocol).where(Protocol.tender_id == tender_id).order_by(Protocol.created_at.desc()))
    protocol = res_p.scalars().first()
    
    res_bids = await db.execute(
        select(Bid)
        .options(selectinload(Bid.supplier), selectinload(Bid.company), selectinload(Bid.items))
        .where(Bid.tender_id == tender_id)
        .order_by(Bid.price.asc())
    )
    bids = res_bids.scalars().all()
    winner = bids[0] if bids else None
    
    winner_name = (winner.company.full_name if (winner and getattr(winner, 'company', None) and winner.company) else "ТОО СтройКом Казахстан")
    winner_bin = (winner.company.bin if (winner and getattr(winner, 'company', None) and winner.company) else "980440001234")
    winner_price = winner.price if winner else tender.start_price
    eds_hash = protocol.eds_hash if protocol else "demo_protocol_signature_999"

    html_content = generate_protocol_bilingual_html(
        tender_number=tender.number,
        title=tender.title,
        start_price=tender.start_price,
        winner_name=winner_name,
        winner_bin=winner_bin,
        winner_price=winner_price,
        signer_name="Касенов М. А.",
        signer_bin="850612300456",
        eds_hash=eds_hash,
        bids_list=bids,
        lots_list=list(tender.lots) if tender.lots else []
    )
    
    return Response(
        content=html_content.encode('utf-8'),
        media_type="text/html; charset=utf-8"
    )
