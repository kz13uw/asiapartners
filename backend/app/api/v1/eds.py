from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid
import base64
import re

from app.db.session import get_db
from app.models.models import EdsSession, User, Company, Tender, Bid, Protocol, UserRole, UserStatus, TenderStatus, AuditLog, generate_account_code
from app.core.security import create_access_token, create_refresh_token
from app.core.kalkan_verifier import verify_and_parse_cms

router = APIRouter()


# ===== SCHEMAS =====

class CreateSessionRequest(BaseModel):
    action: str = "auth"   # auth, publish_tender, submit_bid, sign_protocol
    target_id: Optional[int] = None

class CreateSessionResponse(BaseModel):
    connection_id: str
    nonce: str
    action: str
    target_id: Optional[int] = None
    expires_at: datetime

class VerifySessionRequest(BaseModel):
    connection_id: str
    cms_base64: str
    company_name: Optional[str] = None
    director_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class EdsVerifyRequest(BaseModel):
    cms_base64: str

class EdsVerifyResponse(BaseModel):
    status: str
    iin_bin: str
    subject_name: str


# ===== ENDPOINTS =====

@router.post("/session", response_model=CreateSessionResponse, summary="Создание сессии ЭЦП подписи (Connection ID)")
async def create_eds_session(
    payload: CreateSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Генерирует уникальный connection_id и случайный одноразовый nonce для подписи в NCALayer.
    """
    conn_id = f"conn_{uuid.uuid4().hex[:16]}"
    nonce_val = f"AsiaPartners_Nonce_{uuid.uuid4().hex[:24]}_{int(datetime.utcnow().timestamp())}"
    expires = datetime.utcnow() + timedelta(minutes=10)

    eds_sess = EdsSession(
        connection_id=conn_id,
        nonce=nonce_val,
        action=payload.action,
        target_id=payload.target_id,
        status="pending",
        expires_at=expires
    )
    db.add(eds_sess)
    await db.commit()
    await db.refresh(eds_sess)

    return CreateSessionResponse(
        connection_id=eds_sess.connection_id,
        nonce=eds_sess.nonce,
        action=eds_sess.action,
        target_id=eds_sess.target_id,
        expires_at=eds_sess.expires_at
    )


@router.post("/verify-session", summary="Верификация подписи сессии и выполнения целевого действия")
async def verify_eds_session(
    payload: VerifySessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Проверяет CMS-подпись сессии, парсит данные сертификата, связывает подпись с пользователем/документом.
    """
    # 1. Поиск сессии
    result = await db.execute(select(EdsSession).where(EdsSession.connection_id == payload.connection_id))
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Сессия подписи не найдена или истекла")

    if sess.status == "verified":
        raise HTTPException(status_code=400, detail="Данная сессия подписи уже была использована")

    if sess.expires_at < datetime.utcnow():
        sess.status = "expired"
        await db.commit()
        raise HTTPException(status_code=400, detail="Срок действия сессии подписи истек. Повторите запрос.")

    # 2. Валидация CMS и парсинг данных Kalkan Crypt
    parsed = verify_and_parse_cms(payload.cms_base64)
    if not parsed.get("valid"):
        raise HTTPException(status_code=400, detail=parsed.get("error", "Неверный штамп ЭЦП"))

    is_demo = payload.cms_base64.startswith("demo_") or payload.cms_base64 == "demo_signed_cms_base64_hash_12345"
    company_bin = parsed.get("bin") or ("210440012345" if is_demo else None)
    iin = parsed.get("iin") or ("850101400823" if is_demo else None)

    # 🔒 Строгая проверка: К закупкам допускаются ТОЛЬКО Юридические лица (наличие БИН компании)
    if not company_bin and not is_demo:
        raise HTTPException(
            status_code=400,
            detail="❌ К авторизации и участию в закупках допускаются ТОЛЬКО ЭЦП Юридических лиц (ТОО, АО, ИП, КТ). Предоставленный сертификат принадлежит физическому лицу и не содержит БИН организации."
        )

    if is_demo:
        subject_name = payload.company_name or "ТОО Asia Procurement (Демо)"
    else:
        subject_name = (parsed.get("company_name") if parsed.get("is_legal_entity") else None) or payload.company_name or "Пользователь НУЦ РК"

    sess.cms_base64 = payload.cms_base64
    sess.iin_bin = company_bin or iin
    sess.subject_name = subject_name
    sess.status = "verified"

    # 3. Выполнение целевого действия на основе action
    response_data: Dict[str, Any] = {
        "status": "OK",
        "connection_id": sess.connection_id,
        "action": sess.action,
        "subject_name": subject_name,
        "iin_bin": sess.iin_bin
    }

    if sess.action == "auth":
        # Ищем или создаем пользователя
        res_u = await db.execute(select(User).where(User.iin_bin == iin))
        user = res_u.scalar_one_or_none()
        is_new_user = False

        if not user:
            is_new_user = True
            user = User(
                iin_bin=iin,
                full_name=payload.director_name or subject_name,
                email=payload.email or f"supplier_{iin}@asia.kz",
                phone=payload.phone,
                role=UserRole.SUPPLIER,
                status=UserStatus.ACTIVE
            )
            db.add(user)
            await db.flush()
            user.account_code = generate_account_code(user.id, user.role)
        else:
            if payload.email: user.email = payload.email
            if payload.phone: user.phone = payload.phone

        # Ищем или создаем компанию
        if company_bin:
            res_c = await db.execute(select(Company).where(Company.bin == company_bin))
            company = res_c.scalar_one_or_none()
            if not company:
                company = Company(
                    bin=company_bin,
                    full_name=payload.company_name or f"ТОО {company_bin}",
                    legal_form="ТОО",
                    address=payload.address,
                    phone=payload.phone,
                    email=payload.email,
                    director_name=payload.director_name or subject_name,
                    is_accredited=True,
                    owner_id=user.id
                )
                db.add(company)
                await db.flush()
            else:
                if company.owner_id is None: company.owner_id = user.id
                company.is_accredited = True

        sess.user_id = user.id
        user.last_login = datetime.utcnow()

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role.value})

        response_data.update({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_id": user.id,
            "account_code": user.account_code or generate_account_code(user.id, user.role),
            "role": user.role.value,
            "full_name": user.full_name,
            "is_new_user": is_new_user
        })

    elif sess.action == "publish_tender" and sess.target_id:
        res_t = await db.execute(select(Tender).where(Tender.id == sess.target_id))
        tender = res_t.scalar_one_or_none()
        if tender:
            tender.status = TenderStatus.ACCEPTING
            tender.eds_hash = payload.cms_base64
            tender.published_at = datetime.utcnow()
            response_data["detail"] = f"Тендер #{tender.number} успешно опубликован по ЭЦП"

    elif sess.action == "submit_bid" and sess.target_id:
        res_b = await db.execute(select(Bid).where(Bid.id == sess.target_id))
        bid = res_b.scalar_one_or_none()
        if bid:
            bid.eds_hash = payload.cms_base64
            response_data["detail"] = f"Заявка #{bid.id} успешно подписана ЭЦП"

    log = AuditLog(
        user_id=sess.user_id,
        action=f"EDS_SESSION_VERIFIED_{sess.action.upper()}",
        entity_type="eds_session",
        entity_id=sess.id,
        payload=f"connection_id={sess.connection_id}, iin_bin={sess.iin_bin}"
    )
    db.add(log)
    await db.commit()

    return response_data


@router.get("/session/{connection_id}", summary="Проверка статуса сессии подписи")
async def get_eds_session_status(
    connection_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(EdsSession).where(EdsSession.connection_id == connection_id))
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Сессия подписи не найдена")

    return {
        "connection_id": sess.connection_id,
        "action": sess.action,
        "target_id": sess.target_id,
        "status": sess.status,
        "iin_bin": sess.iin_bin,
        "subject_name": sess.subject_name,
        "created_at": sess.created_at,
        "expires_at": sess.expires_at
    }


@router.post("/verify", response_model=EdsVerifyResponse, summary="Проверка подписи NCALayer (PoC)")
async def verify_eds(payload: EdsVerifyRequest):
    """
    Парсинг CMS подписи и извлечение данных.
    """
    try:
        parsed = verify_and_parse_cms(payload.cms_base64)
        return EdsVerifyResponse(
            status="OK" if parsed.get("valid") else "ERROR",
            iin_bin=parsed.get("iin") or parsed.get("bin") or "123456789012",
            subject_name=parsed.get("company_name") or "Пользователь НУЦ РК"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка парсинга CMS: {str(e)}")
