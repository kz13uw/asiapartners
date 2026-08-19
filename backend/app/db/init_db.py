import asyncio
from sqlalchemy import select, delete as sql_delete
from app.db.session import AsyncSessionLocal, engine, Base
from app.models.models import (
    User, UserRole, UserStatus, Company, ProcurementCategory,
    Tender, Bid, BidDocument, TenderDocument, Protocol, Contract, AuditLog
)
from app.core.security import get_password_hash


import os

async def init_db(clean_all: bool = False):
    should_clean = clean_all or os.getenv("CLEAN_DB_ON_START", "false").lower() == "true"
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[DB INIT NOTICE] Skipped auto create_all: {e}")

    try:
        async with AsyncSessionLocal() as db:
            if should_clean:
                # Полная очистка всех данных
                await db.execute(sql_delete(BidDocument))
                await db.execute(sql_delete(Bid))
                await db.execute(sql_delete(TenderDocument))
                await db.execute(sql_delete(Protocol))
                await db.execute(sql_delete(Contract))
                await db.execute(sql_delete(Tender))
                await db.execute(sql_delete(Company))
                await db.execute(sql_delete(AuditLog))
                await db.execute(sql_delete(User).where(User.username != "admin"))
                await db.commit()

            # 1. Системные пользователи всех ролей
            users_to_seed = [
                {
                    "username": "admin",
                    "full_name": "Главный Администратор Системы",
                    "email": "admin@asiapartners.kz",
                    "hashed_password": get_password_hash("admin123"),
                    "role": UserRole.ADMIN,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "000000000000"
                },
                {
                    "username": "info@asiapartners.kz",
                    "full_name": "Организатор Закупок Asia Partners",
                    "email": "info@asiapartners.kz",
                    "hashed_password": get_password_hash("admin123"),
                    "role": UserRole.ORGANIZER,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "111111111111"
                },
                {
                    "username": "supplier@asia.kz",
                    "full_name": "ТОО СтройСервис Азия",
                    "email": "supplier@asia.kz",
                    "hashed_password": get_password_hash("admin123"),
                    "role": UserRole.SUPPLIER,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "987654321012"
                },
                {
                    "username": "monitoring@asiapartners.kz",
                    "full_name": "Служба Мониторинга и СБ",
                    "email": "monitoring@asiapartners.kz",
                    "hashed_password": get_password_hash("admin123"),
                    "role": UserRole.MONITORING,
                    "status": UserStatus.ACTIVE,
                    "iin_bin": "222222222222"
                }
            ]

            from app.models.models import generate_account_code
            for udata in users_to_seed:
                res = await db.execute(select(User).where((User.email == udata["email"]) | (User.username == udata["username"])))
                exist_user = res.scalar_one_or_none()
                if not exist_user:
                    db.add(User(**udata))
                else:
                    exist_user.hashed_password = udata["hashed_password"]
                    exist_user.status = UserStatus.ACTIVE
                    exist_user.failed_login_attempts = 0

            await db.flush()
            all_users = (await db.execute(select(User))).scalars().all()
            for u in all_users:
                u.account_code = generate_account_code(u.id, u.role)
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
            print("База данных проинициализирована! Учетные записи (admin, info@asiapartners.kz, supplier@asia.kz) готовыми с паролем admin123.")
    except Exception as e:
        print(f"[DB SEED NOTICE] Skipped seed: {e}")


if __name__ == "__main__":
    asyncio.run(init_db(clean_all=True))
