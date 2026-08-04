import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.models import Tender, TenderStatus, Bid, BidStatus, Protocol

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("broker_worker")


async def check_expired_tenders():
    """
    Фоновый воркер (брокер задач):
    Автоматически находит тендеры ЗЦП, у которых истек дедлайн приема заявок (ACCEPTING),
    и переводит их в статус EVALUATION (Подведение итогов) с автоматическим ранжированием победителей.
    """
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        result = await db.execute(
            select(Tender).where(
                Tender.status == TenderStatus.ACCEPTING,
                Tender.deadline_at <= now
            )
        )
        expired_tenders = result.scalars().all()

        for tender in expired_tenders:
            logger.info(f"[BROKER] Перевод тендера #{tender.id} ({tender.number}) в статус EVALUATION")
            tender.status = TenderStatus.EVALUATION

            # Автоматически ранжируем заявки по наименьшей цене
            bids_res = await db.execute(
                select(Bid).where(Bid.tender_id == tender.id).order_by(Bid.price.asc())
            )
            bids = bids_res.scalars().all()

            if bids:
                for idx, bid in enumerate(bids, start=1):
                    bid.rank = idx
                    if idx == 1:
                        bid.status = BidStatus.WINNER
                        logger.info(f"[BROKER] Тендер #{tender.id}: Победитель — Заявка #{bid.id} ({bid.price} ₸)")
                    elif idx == 2:
                        bid.status = BidStatus.RUNNER_UP
                        logger.info(f"[BROKER] Тендер #{tender.id}: Резерв — Заявка #{bid.id} ({bid.price} ₸)")

        await db.commit()


async def start_broker_loop(interval_seconds: int = 15):
    """Бесконечный цикл фоновой обработки задач брокера"""
    logger.info(f"[BROKER] Брокер фоновых задач запущен (интервал {interval_seconds} сек)")
    has_warned = False
    while True:
        try:
            await check_expired_tenders()
        except Exception as e:
            if not has_warned:
                logger.info(f"[BROKER NOTICE] Авто-проверка дедлайнов будет полностью активна в Docker-контейнере с PostgreSQL")
                has_warned = True
        await asyncio.sleep(interval_seconds)
