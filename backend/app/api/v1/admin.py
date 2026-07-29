from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.db.session import get_db
from app.models.models import User, UserRole, UserStatus, AuditLog
from app.schemas.schemas import UserCreate, UserOut
from app.api.v1.auth import get_current_user
from app.api.v1.tenders import require_role
from app.core.security import get_password_hash
import secrets

router = APIRouter()


@router.get("/users", response_model=list[UserOut], summary="Список всех пользователей")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User))
    return result.scalars().all()


@router.post("/users", response_model=UserOut, status_code=201, summary="Создать внутреннего пользователя")
async def create_internal_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email уже занят")

    user = User(
        iin_bin=body.iin_bin,
        full_name=body.full_name,
        email=body.email,
        role=body.role,
        status=UserStatus.ACTIVE,
        hashed_password=get_password_hash(body.password) if body.password else None,
    )
    db.add(user)
    await db.flush()

    log = AuditLog(user_id=current_user.id, action="CREATE_USER", entity_type="user", entity_id=user.id)
    db.add(log)
    return user


@router.patch("/users/{user_id}/block", response_model=UserOut, summary="Заблокировать аккаунт")
async def block_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.status = UserStatus.BLOCKED
    log = AuditLog(user_id=current_user.id, action="BLOCK_USER", entity_type="user", entity_id=user.id)
    db.add(log)
    return user


@router.patch("/users/{user_id}/unblock", response_model=UserOut, summary="Разблокировать аккаунт")
async def unblock_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    user.status = UserStatus.ACTIVE
    return user


@router.post("/users/{user_id}/reset-password", summary="Сгенерировать временный пароль")
async def reset_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    temp_password = secrets.token_urlsafe(12)
    user.hashed_password = get_password_hash(temp_password)

    log = AuditLog(user_id=current_user.id, action="RESET_PASSWORD", entity_type="user", entity_id=user.id)
    db.add(log)
    return {"message": "Временный пароль сгенерирован", "temp_password": temp_password}


@router.get("/audit-log", summary="Журнал аудита действий")
async def get_audit_log(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "ip_address": log.ip_address,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/stats", summary="Статистика системы")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    from app.models.models import Tender, Bid, Company
    total_tenders = (await db.execute(select(func.count(Tender.id)))).scalar()
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_companies = (await db.execute(select(func.count(Company.id)))).scalar()
    total_bids = (await db.execute(select(func.count(Bid.id)))).scalar()
    return {
        "total_tenders": total_tenders,
        "total_users": total_users,
        "total_companies": total_companies,
        "total_bids": total_bids,
    }
