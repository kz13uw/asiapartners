#!/usr/bin/env python3
import sys
import unittest
import os

# Добавляем родительскую директорию в sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def cleanup_test_tenders():
    try:
        import asyncio
        from app.db.session import AsyncSessionLocal
        from app.models.models import Tender, Lot, QualificationRequirement, TenderDocument, Bid
        from sqlalchemy import select, delete

        async def run_clean():
            async with AsyncSessionLocal() as db:
                res = await db.execute(select(Tender.id).where(
                    (Tender.title.like('%Автотест%')) | 
                    (Tender.number.like('T-2026-%')) |
                    (Tender.title.like('%Поставка силового кабеля%'))
                ))
                t_ids = res.scalars().all()
                if t_ids:
                    await db.execute(delete(Bid).where(Bid.tender_id.in_(t_ids)))
                    await db.execute(delete(Lot).where(Lot.tender_id.in_(t_ids)))
                    await db.execute(delete(QualificationRequirement).where(QualificationRequirement.tender_id.in_(t_ids)))
                    await db.execute(delete(TenderDocument).where(TenderDocument.tender_id.in_(t_ids)))
                    await db.execute(delete(Tender).where(Tender.id.in_(t_ids)))
                    await db.commit()
                    print("🧹 [CLEANUP] Тестовые закупки автотеста автоматически удалены из базы данных")

        asyncio.run(run_clean())
    except Exception as e:
        pass

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 ЗАПУСК АВТОМАТИЗИРОВАННОГО ТЕСТИРОВАНИЯ (TEST SUITE)")
    print("=" * 60)

    loader = unittest.TestLoader()
    start_dir = os.path.join(os.path.dirname(__file__), "tests")
    suite = loader.discover(start_dir, pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    cleanup_test_tenders()

    print("=" * 60)
    if result.wasSuccessful():
        print("✅ ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! (100% PASS)")
        sys.exit(0)
    else:
        print(f"❌ ОШИБКА: Провалено тестов: {len(result.failures)}, Ошибок: {len(result.errors)}")
        sys.exit(1)
