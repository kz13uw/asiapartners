import asyncio
from sqlalchemy import select, delete as sql_delete
from app.db.session import AsyncSessionLocal, engine, Base
from app.models.models import (
    User, UserRole, UserStatus, Company, ProcurementCategory,
    Tender, Bid, BidDocument, TenderDocument, Protocol, Contract, AuditLog
)
from app.core.security import get_password_hash


async def init_db(clean_all: bool = True):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[DB INIT NOTICE] Skipped auto create_all: {e}")

    try:
        async with AsyncSessionLocal() as db:
            if clean_all:
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

            # 1. Единственный Администратор Системы
            res = await db.execute(select(User).where(User.username == "admin"))
            admin_user = res.scalar_one_or_none()

            if not admin_user:
                admin_user = User(
                    username="admin",
                    full_name="Главный Администратор Системы",
                    email="admin@asiapartners.kz",
                    hashed_password=get_password_hash("admin123"),
                    role=UserRole.ADMIN,
                    status=UserStatus.ACTIVE,
                    iin_bin="000000000000"
                )
                db.add(admin_user)
                await db.flush()

            # 2. Категории закупок холдинга Asia Partners
            default_categories = [
                {"name": "🏗️ Строительство и Девелопмент", "code": "construction", "icon": "building", "description": "Гражданское и промышленное строительство, СМР, строительные материалы"},
                {"name": "🌾 Сельское хозяйство и Агросектор", "code": "agri", "icon": "sprout", "description": "Агропромышленный комплекс, зерновые культуры, агрохимия и спецтехника"},
                {"name": "🏨 Гостиничный бизнес и HoReCa", "code": "hospitality", "icon": "hotel", "description": "Оснащение отелей, гостинично-ресторанный комплекс, клининг и общепит"},
                {"name": "🚚 Транспорт и Логистика", "code": "logistics", "icon": "truck", "description": "Грузоперевозки, логистические услуги, спецтехника и ГСМ"},
                {"name": "🏭 Производство и Промышленность", "code": "production", "icon": "factory", "description": "Заводское производство, промышленное оборудование и сырье"},
            ]

            for cat_data in default_categories:
                cat_res = await db.execute(select(ProcurementCategory).where(ProcurementCategory.code == cat_data["code"]))
                if not cat_res.scalar_one_or_none():
                    db.add(ProcurementCategory(**cat_data))

            await db.commit()
            print("База данных на 100% очищена! Единственный пользователь в системе — Администратор (admin / admin123).")
    except Exception as e:
        print(f"[DB SEED NOTICE] Skipped seed: {e}")


if __name__ == "__main__":
    asyncio.run(init_db(clean_all=True))
