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

            # 3. Тестовые закупки для демонстрации
            from app.models.models import TenderMethod, TenderStatus
            from datetime import timedelta, datetime

            tenders_count = (await db.execute(select(Tender))).scalars().all()
            if not tenders_count:
                organizer = (await db.execute(select(User).where(User.username == "info@asiapartners.kz"))).scalar_one_or_none()
                org_id = organizer.id if organizer else 1
                org_code = organizer.computed_account_code if organizer else "ORG00000002"
                materials_cat = (await db.execute(select(ProcurementCategory).where(ProcurementCategory.code == "materials"))).scalar_one_or_none()
                construction_cat = (await db.execute(select(ProcurementCategory).where(ProcurementCategory.code == "construction"))).scalar_one_or_none()
                agri_cat = (await db.execute(select(ProcurementCategory).where(ProcurementCategory.code == "agri_goods"))).scalar_one_or_none()

                sample_tenders = [
                    Tender(
                        number="TNK-2026-001",
                        title="Поставка портландцемента М500 для объектов холдинга",
                        description="Закупка портландцемента марки М500 Д0 в объеме 500 тонн для объектов строительства холдинга Asia Partners.",
                        subject_type=TenderSubjectType.GOODS,
                        category_id=materials_cat.id if materials_cat else 1,
                        method=TenderMethod.ZCP,
                        start_price=15000000.0,
                        current_lowest_price=15000000.0,
                        status=TenderStatus.ACCEPTING,
                        deadline_at=datetime.utcnow() + timedelta(days=10),
                        delivery_place="г. Семей, ул. Кабанбай Батыра 42",
                        organizer_id=org_id,
                        organizer_code=org_code,
                        published_at=datetime.utcnow()
                    ),
                    Tender(
                        number="TNK-2026-002",
                        title="Строительно-монтажные работы по возведению складского комплекса",
                        description="Выполнение комплекса СМР по объекту 'Складской логистический терминал Asia Partners'.",
                        subject_type=TenderSubjectType.SERVICES_WORKS,
                        category_id=construction_cat.id if construction_cat else 2,
                        method=TenderMethod.ZCP,
                        start_price=45000000.0,
                        current_lowest_price=45000000.0,
                        status=TenderStatus.ACCEPTING,
                        deadline_at=datetime.utcnow() + timedelta(days=14),
                        delivery_place="ВКО, г. Семей, Промзона",
                        organizer_id=org_id,
                        organizer_code=org_code,
                        published_at=datetime.utcnow()
                    ),
                    Tender(
                        number="TNK-2026-003",
                        title="Поставка комплексных минеральных удобрений и агрохимии",
                        description="Закупка аммофоса и селитры аммиачной для посевной кампании агропредприятий холдинга.",
                        subject_type=TenderSubjectType.GOODS,
                        category_id=agri_cat.id if agri_cat else 3,
                        method=TenderMethod.ZCP,
                        start_price=8500000.0,
                        current_lowest_price=8500000.0,
                        status=TenderStatus.ACCEPTING,
                        deadline_at=datetime.utcnow() + timedelta(days=7),
                        delivery_place="Абайская область, Бородулихинский район",
                        organizer_id=org_id,
                        organizer_code=org_code,
                        published_at=datetime.utcnow()
                    ),
                ]
                for t_item in sample_tenders:
                    exist_t = (await db.execute(select(Tender).where(Tender.number == t_item.number))).scalar_one_or_none()
                    if not exist_t:
                        db.add(t_item)
                await db.flush()

                # 4. Тестовые заявки поставщиков для проверки Вскрытия / Оценки
                from app.models.models import BidStatus
                supplier_user = (await db.execute(select(User).where(User.email == "supplier@asia.kz"))).scalar_one_or_none()
                if not supplier_user:
                    supplier_user = User(
                        username="supplier@asia.kz",
                        full_name="ТОО СтройСервис Азия",
                        email="supplier@asia.kz",
                        hashed_password=get_password_hash("admin123"),
                        role=UserRole.SUPPLIER,
                        status=UserStatus.ACTIVE,
                        iin_bin="987654321012"
                    )
                    db.add(supplier_user)
                    await db.flush()

                supplier_comp = (await db.execute(select(Company).where(Company.bin == "987654321012"))).scalar_one_or_none()
                if not supplier_comp:
                    supplier_comp = Company(
                        bin="987654321012",
                        full_name="ТОО СтройСервис Азия",
                        legal_form="ТОО",
                        address="г. Семей, ул. Ауэзова 12",
                        phone="+7 7222 55 44 33",
                        email="supplier@asia.kz",
                        director_name="Касымов Асхат Берикович",
                        is_accredited=True,
                        owner_id=supplier_user.id
                    )
                    db.add(supplier_comp)
                    await db.flush()

                b1 = Bid(
                    tender_id=sample_tenders[0].id,
                    supplier_id=supplier_user.id,
                    company_id=supplier_comp.id,
                    price=14200000.0,
                    status=BidStatus.SUBMITTED,
                    eds_hash="demo_bid_signature_001"
                )
                b2 = Bid(
                    tender_id=sample_tenders[1].id,
                    supplier_id=supplier_user.id,
                    company_id=supplier_comp.id,
                    price=43500000.0,
                    status=BidStatus.SUBMITTED,
                    eds_hash="demo_bid_signature_002"
                )
                db.add(b1)
                db.add(b2)
                await db.commit()

            print("База данных проинициализирована! Учетные записи, закупки и заявки созданы.")
    except Exception as e:
        print(f"[DB SEED NOTICE] Skipped seed: {e}")


if __name__ == "__main__":
    asyncio.run(init_db(clean_all=True))
