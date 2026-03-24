import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="",
    )

    # App
    APP_NAME: str = "Event CRM"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = ""
    REDIS_URL: str = ""

    @property
    def sqlalchemy_database_url(self) -> str:
        # Priority 1: Render Internal URL (Best)
        url = os.environ.get("RENDER_POSTGRES_INTERNAL_URL")
        # Priority 2: Standard Database URL
        if not url:
            url = os.environ.get("DATABASE_URL")
            
        if not url:
            return ""
            
        # Ensure asyncpg driver
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif not url.startswith("postgresql+asyncpg://"):
            url = f"postgresql+asyncpg://{url}"
            
        return url

    @property
    def redis_url_transformed(self) -> str:
        default_redis = "redis://localhost:6379/0"
        return os.environ.get("REDIS_URL") or self.REDIS_URL or default_redis

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_API_ID: str = "0"  # Changed to str to handle 'temp' or other values
    TELEGRAM_API_HASH: str = ""

    @property
    def telegram_api_id_int(self) -> int:
        try:
            return int(self.TELEGRAM_API_ID)
        except (ValueError, TypeError):
            return 0

    # OpenAI for message parsing (optional)
    OPENAI_API_KEY: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
