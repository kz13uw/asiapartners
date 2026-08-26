import asyncio
from sqlalchemy import select, delete as sql_delete
from app.db.session import AsyncSessionLocal, engine, Base
from app.models.models import (
    User, UserRole, UserStatus, Company, ProcurementCategory,
    Tender, Lot, QualificationRequirement, TenderDocument,
    Bid, BidItem, BidDocument, SupplierDocument, Protocol, Contract,
    AuditLog, UserCertificate, CategorySubscription, Notification, EdsSession, TokenBlacklist
)
from app.core.security import get_password_hash


import os

async def init_db(clean_all: bool = False):
    should_clean = clean_all or os.getenv("CLEAN_DB_ON_START", "false").lower() == "true"
    try:
        async with engine.begin() as conn:
            if should_clean:
                await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[DB INIT NOTICE] Skipped auto schema sync: {e}")

    try:
        async with AsyncSessionLocal() as db:
            if should_clean:
                # Полная очистка всех данных (с учетом всех внешних ключей)
                await db.execute(sql_delete(Contract))
                await db.execute(sql_delete(Protocol))
                await db.execute(sql_delete(BidItem))
                await db.execute(sql_delete(BidDocument))
                await db.execute(sql_delete(SupplierDocument))
                await db.execute(sql_delete(Bid))
                await db.execute(sql_delete(TenderDocument))
                await db.execute(sql_delete(QualificationRequirement))
                await db.execute(sql_delete(Lot))
                await db.execute(sql_delete(Tender))
                await db.execute(sql_delete(Company))
                await db.execute(sql_delete(AuditLog))
                await db.execute(sql_delete(UserCertificate))
                await db.execute(sql_delete(CategorySubscription))
                await db.execute(sql_delete(Notification))
                await db.execute(sql_delete(EdsSession))
                await db.execute(sql_delete(TokenBlacklist))
                await db.execute(sql_delete(User))
                await db.commit()

            master_pwd = os.getenv("ADMIN_PASSWORD", "Asia@Procurement2025!")
            hashed_master = get_password_hash(master_pwd)

            # Гарантированное наличие системных аккаунтов по умолчанию
            users_to_seed = [
                {
                    "username": "admin@asiapartners.kz",
                    "full_name": "Главный Администратор Системы",
                    "email": "admin@asiapartners.kz",
                    "hashed_password": hashed_master,
                    "role": UserRole.ADMIN,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "000000000000"
                },
                {
                    "username": "info@asiapartners.kz",
                    "full_name": "Организатор Закупок Asia Partners",
                    "email": "info@asiapartners.kz",
                    "hashed_password": hashed_master,
                    "role": UserRole.ORGANIZER,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "111111111111"
                },
                {
                    "username": "monitoring@asiapartners.kz",
                    "full_name": "Служба Мониторинга и СБ",
                    "email": "monitoring@asiapartners.kz",
                    "hashed_password": hashed_master,
                    "role": UserRole.MONITORING,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "222222222222"
                },
                {
                    "username": "supplier@asia.kz",
                    "full_name": "ТОО СтройСервис Азия",
                    "email": "supplier@asia.kz",
                    "hashed_password": hashed_master,
                    "role": UserRole.SUPPLIER,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "987654321012"
                }
            ]

            from app.models.models import generate_account_code
            for udata in users_to_seed:
                res = await db.execute(select(User).where((User.email == udata["email"]) | (User.username == udata["username"])))
                exist_user = res.scalar_one_or_none()
                if not exist_user:
                    db.add(User(**udata))




            await db.flush()
            all_users = (await db.execute(select(User))).scalars().all()
            for u in all_users:
                u.account_code = generate_account_code(u.id, u.role, u.email)
            await db.commit()

            # 2. Категории закупок холдинга Asia Partners
            from app.models.models import TenderSubjectType
            default_categories = [
                {"name": "📦 Поставка Строительных Материалов", "code": "materials", "icon": "package", "subject_type": TenderSubjectType.GOODS, "description": "Поставка цемента, арматуры, металлопроката и труб (Товары)"},
                {"name": "🏗️ Строительно-Монтажные Работы (СМР)", "code": "construction", "icon": "building", "subject_type": TenderSubjectType.SERVICES_WORKS, "description": "Строительство, капитальный ремонт и реконструкция (Работы)"},
                {"name": "🌾 Сельхозпродукция и Агрохимия", "code": "agri_goods", "icon": "sprout", "subject_type": TenderSubjectType.GOODS, "description": "Поставка агропродукции, зерна и удобрений (Товары)"},
                {"name": "🛠️ Обслуживание и Ремонт Спецтехники", "code": "agri_services", "icon": "wrench", "subject_type": TenderSubjectType.SERVICES_WORKS, "description": "Сервис и ремонт сельхозтехники и оборудования (Услуги)"},
                {"name": "🚚 Транспортные и Логистические Услуги", "code": "logistics_services", "icon": "truck", "subject_type": TenderSubjectType.SERVICES_WORKS, "description": "Грузоперевозки, автотранспорт и спецтехника (Услуги)"},
            ]

            for cat_data in default_categories:
                cat_res = await db.execute(select(ProcurementCategory).where(ProcurementCategory.code == cat_data["code"]))
                exist_cat = cat_res.scalar_one_or_none()
                if not exist_cat:
                    db.add(ProcurementCategory(**cat_data))
                else:
                    exist_cat.subject_type = cat_data["subject_type"]
                    exist_cat.name = cat_data["name"]

            await db.commit()

            # 3. Базовая настройка категорий и структуры (без создания жестко захаркоженных демо-тендеров)
            from app.models.models import TenderMethod, TenderStatus
            from datetime import timedelta, datetime
            from sqlalchemy import update

            # Миграция статуса 'accepting' -> 'published' в существующей базе данных
            await db.execute(
                update(Tender)
                .where(Tender.status == "accepting")
                .values(status=TenderStatus.PUBLISHED)
            )
            await db.commit()


            print("База данных проинициализирована! Пользователи и структуры созданы.")

    except Exception as e:
        print(f"[DB SEED NOTICE] Skipped seed: {e}")


if __name__ == "__main__":
    asyncio.run(init_db(clean_all=True))
