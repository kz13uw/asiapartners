import json
import time
import asyncio
import logging
from typing import Optional, Any, Callable
from functools import wraps
from fastapi import Request, Response
from app.core.config import settings

logger = logging.getLogger("cache_manager")

# Внутреннее память-хранилище (Fallback если Redis недоступен)
_memory_cache = {}


class CacheManager:
    def __init__(self):
        self.redis_client = None
        self.use_redis = False

    async def init_redis(self):
        try:
            import redis.asyncio as aioredis
            self.redis_client = aioredis.from_url(
                settings.REDIS_URL,
                socket_timeout=1,
                decode_responses=True
            )
            await self.redis_client.ping()
            self.use_redis = True
            logger.info("[CACHE] Подключение к Redis успешно установлено")
        except Exception as e:
            self.use_redis = False
            logger.info(f"[CACHE NOTICE] Redis недоступен ({e}). Использован встроенный In-Memory кеш.")

    async def get(self, key: str) -> Optional[Any]:
        if self.use_redis and self.redis_client:
            try:
                val = await self.redis_client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.warning(f"[CACHE] Ошибка чтения из Redis: {e}")

        # Fallback to In-Memory
        entry = _memory_cache.get(key)
        if entry:
            val, expire_at = entry
            if expire_at is None or expire_at > time.time():
                return val
            else:
                _memory_cache.pop(key, None)
        return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 60):
        try:
            serialized = json.dumps(value, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"[CACHE] Ошибка сериализации значения для {key}: {e}")
            return

        if self.use_redis and self.redis_client:
            try:
                await self.redis_client.set(key, serialized, ex=ttl_seconds)
                return
            except Exception as e:
                logger.warning(f"[CACHE] Ошибка записи в Redis: {e}")

        # Fallback to In-Memory
        expire_at = time.time() + ttl_seconds
        _memory_cache[key] = (value, expire_at)

    async def delete(self, pattern_or_key: str):
        if self.use_redis and self.redis_client:
            try:
                if "*" in pattern_or_key:
                    keys = await self.redis_client.keys(pattern_or_key)
                    if keys:
                        await self.redis_client.delete(*keys)
                else:
                    await self.redis_client.delete(pattern_or_key)
            except Exception as e:
                logger.warning(f"[CACHE] Ошибка очистки Redis: {e}")

        # Clear In-Memory
        if "*" in pattern_or_key:
            prefix = pattern_or_key.replace("*", "")
            keys_to_del = [k for k in _memory_cache if k.startswith(prefix)]
            for k in keys_to_del:
                _memory_cache.pop(k, None)
        else:
            _memory_cache.pop(pattern_or_key, None)


cache_manager = CacheManager()


def cache_response(ttl_seconds: int = 60, prefix: str = "fastapi_cache"):
    """Декоратор для асинхронных роутеров FastAPI"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Ищем объект request
            request: Optional[Request] = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            # Генерируем уникальный ключ кеша по пути и Query параметров
            if request:
                cache_key = f"{prefix}:{request.url.path}:{str(request.query_params)}"
            else:
                cache_key = f"{prefix}:{func.__name__}:{str(kwargs)}"

            cached_data = await cache_manager.get(cache_key)
            if cached_data is not None:
                return cached_data

            result = await func(*args, **kwargs)

            # Кешируем ответ
            if result is not None:
                try:
                    # Если результат — pydantic модель или схема с .model_dump()
                    if hasattr(result, "model_dump"):
                        jsonable = result.model_dump(mode="json")
                    elif isinstance(result, list):
                        jsonable = [item.model_dump(mode="json") if hasattr(item, "model_dump") else item for item in result]
                    else:
                        jsonable = result
                    await cache_manager.set(cache_key, jsonable, ttl_seconds=ttl_seconds)
                except Exception as e:
                    logger.warning(f"[CACHE DECORATOR NOTICE] Failed to cache result: {e}")

            return result
        return wrapper
    return decorator
