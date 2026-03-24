from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from redis.asyncio import Redis
from app.config import get_settings

settings = get_settings()

# Log hostnames for debugging (masking credentials)
def _log_service_host(url: str, label: str):
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        print(f"DEBUG: {label} host: {p.hostname}:{p.port}")
    except Exception:
        print(f"DEBUG: {label} URL malformed or hidden")

_log_service_host(settings.sqlalchemy_database_url, "Database")
_log_service_host(settings.redis_url_transformed, "Redis")

engine = create_async_engine(
    settings.sqlalchemy_database_url,
    echo=False, # Force off for production
    pool_pre_ping=True,
    pool_size=5, # Reduced for Render Free/Small tier
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            print(f"DEBUG: DB Session Error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

# Redis
_redis: Redis | None = None

async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url_transformed, decode_responses=True)
    return _redis
