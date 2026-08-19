from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator
import json

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Портал закупок Asia Partners"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://asia:asia_super_secret_pass@db:5432/asia_procurement"
    DATABASE_URL_SYNC: str = "postgresql://asia:asia_super_secret_pass@db:5432/asia_procurement"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_32_CHARS_MIN"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10  # 10 минут = 600 секунд
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_trimmed = v.strip()
            if not v_trimmed:
                return ["http://localhost:5173"]
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [i.strip() for i in v_trimmed.split(",") if i.strip()]
        return v or ["http://localhost:5173"]

    # File storage
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE_MB: int = 50

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
