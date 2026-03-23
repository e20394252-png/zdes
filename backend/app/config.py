import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# TOP-LEVEL DEBUG PRINT FOR RENDER
print("--- STARTING CONFIG IMPORT ---", flush=True)
for k, v in os.environ.items():
    if any(x in k for x in ["DATABASE", "POSTGRES", "URL", "REDIS"]):
        print(f"DEBUG ENV: {k} = {v[:15]}...", flush=True)
print("--- END CONFIG IMPORT ---", flush=True)


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
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/event_crm"
    REDIS_URL: str = "redis://redis:6379/0"

    @property
    def sqlalchemy_database_url(self) -> str:
        # Priority 1: Direct OS env (bypassing Pydantic if needed)
        url = os.getenv("DATABASE_URL") or self.DATABASE_URL
        
        # Aggressive debug print
        print(f"DEBUG: Final URL prefix used: {url[:20]}...", flush=True)
        
        # Render provides postgres://, but asyncpg needs postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        # If it's still 'db' (the default), and we are on Render, something is wrong
        if "@db:" in url and os.environ.get("RENDER"):
            print("WARNING: Using default 'db' hostname on Render! Trying to find RENDER_POSTGRES_INTERNAL_URL...", flush=True)
            render_url = os.environ.get("RENDER_POSTGRES_INTERNAL_URL")
            if render_url:
                url = render_url.replace("postgres://", "postgresql+asyncpg://", 1)
                print("DEBUG: Switched to RENDER_POSTGRES_INTERNAL_URL", flush=True)

        return url

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
