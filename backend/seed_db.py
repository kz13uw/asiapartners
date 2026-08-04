import sys
import os

# Добавляем корневой каталог в PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import asyncio
from app.db.init_db import init_db

if __name__ == "__main__":
    print("Инициализация базы данных PostgreSQL и админа (admin / admin123)...")
    asyncio.run(init_db(clean_all=True))
    print("ОПЕРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!")
