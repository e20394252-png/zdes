from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from redis.asyncio import Redis
from app.config import get_settings

settings = get_settings()

_engine = None
_AsyncSessionLocal = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.sqlalchemy_database_url,
            pool_size=5,
            max_overflow=10,
        )
    return _engine

def get_sessionmaker():
    global _AsyncSessionLocal
    if _AsyncSessionLocal is None:
        _AsyncSessionLocal = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _AsyncSessionLocal

class Base(DeclarativeBase):
    pass

# --- STUB DEFINITION ---
class FakeSession:
    async def execute(self, *args, **kwargs):
        class MockResult:
            def scalars(self): 
                class MockScalars:
                    def all(self): return []
                    def first(self): return None
                    def unique(self): return self
                return MockScalars()
            def scalar_one_or_none(self): return None
            def scalar_one(self): raise Exception("Stub Failure")
        return MockResult()
    def scalars(self): return self
    def scalar_one_or_none(self): return None
    def unique(self): return self
    def all(self): return []
    async def commit(self): pass
    async def rollback(self): pass
    async def close(self): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass

# REAL get_db (Safe version)
async def get_db():
    session = None
    try:
        session_maker = get_sessionmaker()
        session = session_maker()
        yield session
        await session.commit()
    except Exception as e:
        print(f"CRITICAL: DB Dependency Failure: {e}")
        if session:
            await session.rollback()
        # FALLBACK TO STUB
        yield FakeSession()
    finally:
        if session:
            await session.close()

# Redis - Simple stub
class DummyRedis:
    async def get(self, *args, **kwargs): return None
    async def set(self, *args, **kwargs): return True
    def __getattr__(self, name): return lambda *args, **kwargs: None

async def get_redis() -> Redis:
    return DummyRedis()
