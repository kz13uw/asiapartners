from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List

from app.db.session import get_db
from app.models.models import User, Notification
from app.schemas.schemas import NotificationOut
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[NotificationOut], summary="Список уведомлений пользователя")
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.patch("/{notification_id}/read", response_model=NotificationOut, summary="Отметить как прочитанное")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif


@router.post("/read-all", summary="Отметить все как прочитанные")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Все уведомления отмечены как прочитанные"}


@router.delete("/{notification_id}", summary="Удалить уведомление")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")

    await db.delete(notif)
    await db.commit()
    return {"message": "Уведомление удалено"}
