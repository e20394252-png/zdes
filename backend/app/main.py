from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import api
from app.config import get_settings
from app.database import engine, Base, get_db
from app.models.user import User
from app.core.deps import require_user

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("DEBUG: Application starting up (Production Restore)...")
    
    async def startup_tasks():
        try:
            # Important: Use a fresh session/connection for background tasks
            async with engine.begin() as conn:
                print("DEBUG: Running migrations...")
                await conn.run_sync(Base.metadata.create_all)
            
            from app.seed import seed, ensure_halls
            await seed()
            await ensure_halls()
            print("DEBUG: Background startup tasks finished successfully")
        except Exception as e:
            print(f"DEBUG: Background startup tasks FAILED: {e}")

    import asyncio
    asyncio.create_task(startup_tasks())
    
    yield
    print("DEBUG: Application shutting down...")
    await engine.dispose()

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Standard permissive CORS for now, can be tightened later if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Production server is UP"}

@app.get("/api/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database is reachable!"}
    except Exception as e:
        return {"status": "error", "message": f"DB unreachable: {e}"}
