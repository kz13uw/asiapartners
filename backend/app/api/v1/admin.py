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
    result = await db.execute(select(User).where(User.id != current_user.id).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users", response_model=UserOut, status_code=201, summary="Создать пользователя (Организатор / Мониторинг)")
async def create_internal_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    if body.email:
        existing_email = await db.execute(select(User).where(User.email == body.email))
        if existing_email.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email уже занят")

    if body.username:
        existing_username = await db.execute(select(User).where(User.username == body.username))
        if existing_username.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Логин (username) уже занят")

    if body.password:
        from app.core.security import validate_password_policy
        is_valid, msg = validate_password_policy(body.password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)
    else:
        # [P2-FIX] Генерируем безопасный временный пароль вместо предсказуемого Pass1234!
        body.password = secrets.token_urlsafe(16) + "A1!"

    user = User(
        username=body.username or body.email or body.iin_bin,
        iin_bin=body.iin_bin or f"ADM{secrets.token_hex(4).upper()}",
        full_name=body.full_name,
        email=body.email,
        role=body.role,
        status=UserStatus.ACTIVE,
        hashed_password=get_password_hash(body.password),
    )
    db.add(user)
    await db.flush()
    from app.models.models import generate_account_code
    user.account_code = generate_account_code(user.id, user.role)

    if body.company_address:
        from app.models.models import Company
        comp = Company(
            bin=user.iin_bin or f"BIN{secrets.token_hex(4).upper()}",
            full_name=body.full_name,
            legal_form="ТОО",
            address=body.company_address,
            is_accredited=True,
            owner_id=user.id
        )
        db.add(comp)

    await db.commit()
    await db.refresh(user)
    log = AuditLog(user_id=current_user.id, action="CREATE_USER", entity_type="user", entity_id=user.id)
    db.add(log)
    await db.commit()
    return user


@router.delete("/users/{user_id}", summary="Удалить пользователя")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    from app.models.models import Company, Tender, AuditLog
    from sqlalchemy import update as sql_update

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить собственного администратора")
    
    # 1. Переназначаем компании пользователя на текущего администратора
    await db.execute(sql_update(Company).where(Company.owner_id == user_id).values(owner_id=current_user.id))

    # 2. Переназначаем созданные тендеры на администратора
    await db.execute(sql_update(Tender).where(Tender.organizer_id == user_id).values(organizer_id=current_user.id))

    # 3. Отвязываем логи аудита
    await db.execute(sql_update(AuditLog).where(AuditLog.user_id == user_id).values(user_id=None))

    # 4. Удаляем пользователя
    await db.delete(user)
    
    # 5. Логируем действие
    log = AuditLog(user_id=current_user.id, action="DELETE_USER", entity_type="user", entity_id=user_id)
    db.add(log)
    await db.commit()
    return {"message": "Пользователь успешно удален"}


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
    await db.commit()
    await db.refresh(user)
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
    log = AuditLog(user_id=current_user.id, action="UNBLOCK_USER", entity_type="user", entity_id=user.id)
    db.add(log)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password", summary="Сгенерировать новый/временный пароль")
async def reset_password(
    user_id: int,
    new_password: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    temp_password = new_password or secrets.token_urlsafe(10)
    user.hashed_password = get_password_hash(temp_password)

    log = AuditLog(user_id=current_user.id, action="RESET_PASSWORD", entity_type="user", entity_id=user.id)
    db.add(log)
    await db.commit()
    return {"message": "Пароль успешно сброшен", "temp_password": temp_password}


@router.get("/audit-log", summary="Журнал аудита действий")
async def get_audit_log(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MONITORING)),
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
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MONITORING)),
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
