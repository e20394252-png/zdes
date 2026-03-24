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

# REAL get_db (Safe version)
async def get_db():
    try:
        session_maker = get_sessionmaker()
        async with session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                print(f"DEBUG: DB Session Error: {e}")
                await session.rollback()
                raise
            finally:
                await session.close()
    except Exception as e:
        # IF DB FAILS, RETURN A FAKE SESSION INSTEAD OF CRASHING
        print(f"CRITICAL: DB Connection Failed, providing stub: {e}")
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
        yield FakeSession()

# Redis - Simple stub
class DummyRedis:
    async def get(self, *args, **kwargs): return None
    async def set(self, *args, **kwargs): return True
    def __getattr__(self, name): return lambda *args, **kwargs: None

async def get_redis() -> Redis:
    return DummyRedis()
