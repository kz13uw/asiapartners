import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1 import auth, tenders, bids, suppliers, users, admin, eds, categories, notifications

from contextlib import asynccontextmanager
from app.db.init_db import init_db
from app.core.tasks import start_broker_loop
import asyncio


from app.core.cache import cache_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"DB init warning: {e}")

    try:
        await cache_manager.init_redis()
    except Exception as e:
        print(f"Cache init notice: {e}")

    # Запуск асинхронного брокера задач в фоновом режиме
    broker_task = asyncio.create_task(start_broker_loop(interval_seconds=15))
    yield
    broker_task.cancel()


app = FastAPI(
    title="Портал электронных закупок — Фирма Азия",
    description="API для управления закупочной деятельностью",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS — разрешаем React-фронтенд
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Роутеры
app.include_router(auth.router,          prefix="/api/v1/auth",          tags=["Аутентификация ЭЦП"])
app.include_router(tenders.router,       prefix="/api/v1/tenders",       tags=["Тендеры"])
app.include_router(bids.router,          prefix="/api/v1/bids",          tags=["Заявки"])
app.include_router(suppliers.router,     prefix="/api/v1/suppliers",     tags=["Контрагенты"])
app.include_router(users.router,         prefix="/api/v1/users",         tags=["Пользователи"])
app.include_router(admin.router,         prefix="/api/v1/admin",         tags=["Администрирование"])
app.include_router(eds.router,           prefix="/api/v1/eds",           tags=["NCALayer Пок"])
app.include_router(categories.router,    prefix="/api/v1/categories",    tags=["Категории закупок"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Уведомления"])


@app.get("/api/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": "asia-procurement-api"}
