#!/usr/bin/env python3
import sys
import unittest
import os

# Добавляем родительскую директорию в sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 ЗАПУСК АВТОМАТИЗИРОВАННОГО ТЕСТИРОВАНИЯ (TEST SUITE)")
    print("=" * 60)

    loader = unittest.TestLoader()
    start_dir = os.path.join(os.path.dirname(__file__), "tests")
    suite = loader.discover(start_dir, pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("=" * 60)
    if result.wasSuccessful():
        print("✅ ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! (100% PASS)")
        sys.exit(0)
    else:
        print(f"❌ ОШИБКА: Провалено тестов: {len(result.failures)}, Ошибок: {len(result.errors)}")
        sys.exit(1)
