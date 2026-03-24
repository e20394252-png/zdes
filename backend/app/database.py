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
        print(f"DEBUG: {label} URL hidden or missing")

_log_service_host(settings.sqlalchemy_database_url, "Database")

engine = create_async_engine(
    settings.sqlalchemy_database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=1, # MINIMAL POOL for stability
    max_overflow=2,
    connect_args={
        "command_timeout": 5, # Fail fast if DB is slow
    }
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
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                print(f"DEBUG: DB Session Internal Error: {e}")
                await session.rollback()
                raise
            finally:
                await session.close()
    except Exception as e:
        print(f"DEBUG: get_db FAIL: {e}")
        # Re-raise for FastAPI to handle, but at least we logged it
        raise

# Redis - Stubbed for diagnostic phase
class DummyRedis:
    async def get(self, *args, **kwargs): return None
    async def set(self, *args, **kwargs): return True
    async def delete(self, *args, **kwargs): return True
    def __getattr__(self, name): return lambda *args, **kwargs: None

async def get_redis() -> Redis:
    print("DEBUG: Using DUMMY Redis for stability")
    return DummyRedis()
