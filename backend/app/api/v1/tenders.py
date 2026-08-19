from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
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
    subj = str(subject_type).lower()
    prefix = "U" if ("service" in subj or "work" in subj) else "T"
    if tender_id:
        return f"{prefix}{tender_id:08d}"
    import random
    num = random.randint(10000000, 99999999)
    return f"{prefix}{num}"


def require_role(*roles: UserRole):
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        return current_user
    return checker


from app.core.cache import cache_response, cache_manager


# ===== PUBLIC =====

@router.get("", response_model=TenderListOut, summary="Реестр открытых тендеров (публичный)")
@cache_response(ttl_seconds=30, prefix="tenders")
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
    query = select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements), selectinload(Tender.documents)).where(Tender.status.in_([TenderStatus.ACCEPTING, TenderStatus.EVALUATION, TenderStatus.COMPLETED]))

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

    query = select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements), selectinload(Tender.documents)).where(Tender.organizer_id == current_user.id).order_by(Tender.created_at.desc()).offset((page - 1) * size).limit(size)
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
    result = await db.execute(select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements), selectinload(Tender.documents)).where(Tender.id == tender_id))
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")
    if tender.status == TenderStatus.DRAFT:
        if not current_user or (current_user.id != tender.organizer_id and current_user.role != UserRole.ADMIN):
            raise HTTPException(status_code=403, detail="Черновик закупки доступен только создавшему его организатору")
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

    tender_data = body.model_dump(exclude={"lots", "qual_requirements", "documents"})
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
                service_start_date=lot_item.service_start_date,
                service_end_date=lot_item.service_end_date,
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
    res = await db.execute(select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements), selectinload(Tender.documents)).where(Tender.id == tender.id))
    return res.scalar_one()


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
                    service_start_date=lot_item.get('service_start_date'),
                    service_end_date=lot_item.get('service_end_date'),
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
    res = await db.execute(select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements), selectinload(Tender.documents)).where(Tender.id == tender_id))
    return res.scalar_one()


@router.post("/{tender_id}/publish", response_model=TenderOut, summary="Опубликовать тендер (ЭЦП)")
async def publish_tender(
    tender_id: int,
    eds_hash: str = Query("demo_eds_signature_bypassed"),
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
    await db.commit()
    await cache_manager.delete("tenders:*")
    res = await db.execute(select(Tender).options(selectinload(Tender.lots), selectinload(Tender.qual_requirements), selectinload(Tender.documents)).where(Tender.id == tender_id))
    return res.scalar_one()


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
        raise HTTPException(status_code=403, detail="Нет прав на удаление этого тендера")
    
    from app.models.models import Lot, QualificationRequirement, TenderDocument
    await db.execute(delete(Lot).where(Lot.tender_id == tender_id))
    await db.execute(delete(QualificationRequirement).where(QualificationRequirement.tender_id == tender_id))
    await db.execute(delete(TenderDocument).where(TenderDocument.tender_id == tender_id))

    await db.delete(tender)
    log = AuditLog(user_id=current_user.id, action="DELETE_TENDER", entity_type="tender", entity_id=tender_id)
    db.add(log)
    await db.commit()
    await cache_manager.delete("tenders:*")
    return {"message": "Черновик закупки успешно удален"}
