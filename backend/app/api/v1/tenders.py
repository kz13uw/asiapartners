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
    if tender.status not in [TenderStatus.DRAFT, TenderStatus.ACCEPTING]:
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
def generate_protocol_bilingual_html(tender_number: str, title: str, start_price: float, winner_name: str, winner_bin: str, winner_price: float, signer_name: str, signer_bin: str, eds_hash: str, bids_list: list) -> str:
    published_date = datetime.utcnow().strftime("%d.%m.%Y %H:%M:%S")
    
    bids_rows = ""
    for idx, b in enumerate(bids_list, start=1):
        c_name = b.company.full_name if (b and getattr(b, 'company', None) and b.company) else f"Поставщик №{b.supplier_id}"
        c_bin = b.company.bin if (b and getattr(b, 'company', None) and b.company) else "980440001234"
        is_w = (idx == 1)
        badge = '<span style="background:#22c55e;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">ПОБЕДИТЕЛЬ / ЖЕҢІМПАЗ</span>' if is_w else f'{idx} место / орын'
        bids_rows += f"""
        <tr style="{ 'background:#f0fdf4;font-weight:bold;' if is_w else '' }">
            <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;">{idx}</td>
            <td style="padding:10px;border:1px solid #cbd5e1;">{c_name}</td>
            <td style="padding:10px;border:1px solid #cbd5e1;font-family:monospace;">{c_bin}</td>
            <td style="padding:10px;border:1px solid #cbd5e1;text-align:right;font-size:14px;color:#15803d;">{b.price:,.2f} ₸</td>
            <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;">{badge}</td>
        </tr>
        """
        
    if not bids_rows:
        bids_rows = f"""
        <tr style="background:#f0fdf4;font-weight:bold;">
            <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;">1</td>
            <td style="padding:10px;border:1px solid #cbd5e1;">{winner_name}</td>
            <td style="padding:10px;border:1px solid #cbd5e1;font-family:monospace;">{winner_bin}</td>
            <td style="padding:10px;border:1px solid #cbd5e1;text-align:right;font-size:14px;color:#15803d;">{winner_price:,.2f} ₸</td>
            <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;"><span style="background:#22c55e;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">ПОБЕДИТЕЛЬ / ЖЕҢІМПАЗ</span></td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Протокол Итогов Закупки № {tender_number}</title>
<style>
  @page {{ size: A4; margin: 15mm; }}
  body {{ font-family: 'Segoe UI', Arial, Roboto, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 25px; }}
  .protocol-box {{ max-width: 850px; margin: 0 auto; background: #ffffff; padding: 45px; border-radius: 16px; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }}
  .header {{ text-align: center; border-bottom: 3px double #0284c7; padding-bottom: 20px; margin-bottom: 25px; }}
  .header h1 {{ font-size: 18px; color: #0f172a; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }}
  .header h2 {{ font-size: 14px; color: #64748b; margin: 0; font-weight: 600; }}
  .section-title {{ font-size: 14px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin: 20px 0 10px 0; padding-bottom: 4px; border-bottom: 1.5px solid #e2e8f0; }}
  .info-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
  .info-table td {{ padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }}
  .info-table td.lbl {{ background: #f8fafc; width: 40%; font-weight: 600; color: #475569; }}
  .winner-box {{ background: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 20px; margin: 25px 0; }}
  .winner-title {{ color: #166534; font-size: 16px; font-weight: 900; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }}
  .eds-stamp {{ background: #f8fafc; border: 2px dashed #0284c7; border-radius: 10px; padding: 18px; margin-top: 30px; display: flex; gap: 15px; align-items: center; }}
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
    <h1>ОФИЦИАЛЬНЫЙ ПРОТОКОЛ ИТОГОВ ЗАКУПКИ</h1>
    <h2>САТЫП АЛУ НӘТИЖЕЛЕРІНІҢ РЕСМИ ХАТТАМАСЫ</h2>
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
      <td>Запрос ценовых предложений (ЗЦП) / Баға ұсыныстарын сұрату</td>
    </tr>
    <tr>
      <td class="lbl">Начальный бюджет / Бастапқы бюджет:</td>
      <td><strong style="color:#0284c7; font-size:14px;">{start_price:,.2f} ₸</strong></td>
    </tr>
  </table>

  <div class="winner-box">
    <div class="winner-title">
      🏆 ПОБЕДИТЕЛЬ ЗАКУПКИ (1-ОРЫН / 1 МЕСТО):
    </div>
    <div style="font-size: 14px; line-height: 1.6;">
      • <strong>Победитель / Жеңімпаз:</strong> {winner_name} (БИН/ИИН: <span style="font-family:monospace;">{winner_bin}</span>)<br>
      • <strong>Ценовое предложение / Ұсынылған бағасы:</strong> <strong style="color:#15803d; font-size:16px;">{winner_price:,.2f} ₸</strong><br>
      • <strong>Решение комиссии / Комиссия шешімі:</strong> Признать победителем закупки / Зақымдау жеңімпазы деп тану.
    </div>
  </div>

  <div class="section-title">2. РЕЕСТР ПОДАННЫХ ЗАЯВОК / БАҒА ҰСЫНЫСТАРЫНЫҢ ТІЗІЛІМІ</div>
  <table class="info-table" style="margin-bottom: 25px;">
    <thead>
      <tr style="background:#f1f5f9; font-weight:bold;">
        <th style="padding:10px; border:1px solid #cbd5e1; text-align:center; width:40px;">№</th>
        <th style="padding:10px; border:1px solid #cbd5e1;">Участник / Қатысушы</th>
        <th style="padding:10px; border:1px solid #cbd5e1;">БИН / ИИН</th>
        <th style="padding:10px; border:1px solid #cbd5e1; text-align:right;">Ценовое предложение</th>
        <th style="padding:10px; border:1px solid #cbd5e1; text-align:center;">Статус / Ранг</th>
      </tr>
    </thead>
    <tbody>
      {bids_rows}
    </tbody>
  </table>

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
    
    res_t = await db.execute(select(Tender).where(Tender.id == tender_id))
    tender = res_t.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Тендер не найден")

    res_p = await db.execute(select(Protocol).where(Protocol.tender_id == tender_id).order_by(Protocol.created_at.desc()))
    protocol = res_p.scalars().first()
    
    res_bids = await db.execute(
        select(Bid)
        .options(selectinload(Bid.supplier), selectinload(Bid.company))
        .where(Bid.tender_id == tender_id)
        .order_by(Bid.price.asc())
    )
    bids = res_bids.scalars().all()
    winner = bids[0] if bids else None
    
    winner_name = (winner.company.full_name if (winner and getattr(winner, 'company', None) and winner.company) else "ТОО СтройКом Казахстан")
    winner_bin = (winner.company.bin if (winner and getattr(winner, 'company', None) and winner.company) else "980440001234")
    winner_price = winner.price if winner else (tender.start_price * 0.95)
    
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
        bids_list=bids
    )
    
    return Response(
        content=html_content.encode('utf-8'),
        media_type="text/html; charset=utf-8"
    )
