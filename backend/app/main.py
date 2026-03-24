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
    print("DEBUG: Application starting up...")
    try:
        async with engine.begin() as conn:
            print("DEBUG: Checking database connection and running migrations...")
            await conn.run_sync(Base.metadata.create_all)
            print("DEBUG: Migrations/table creation finished")
        
        from app.seed import seed, ensure_halls
        print("DEBUG: Running seed...")
        await seed()
        print("DEBUG: Running ensure_halls...")
        await ensure_halls()
        print("DEBUG: Startup tasks finished")
    except Exception as e:
        print(f"DEBUG: Startup tasks FAILED: {e}")
    
    yield
    print("DEBUG: Application shutting down...")
    await engine.dispose()


app = FastAPI(
    title="Event CRM API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Standard CORSMiddleware - it's the safest way
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporarily permissive to rule out CORS entirely
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database is reachable!"}
    except Exception as e:
        return {"status": "error", "message": f"DB unreachable: {e}"}

@app.get("/api/test-auth")
async def api_test_auth(user: User = Depends(require_user)):
    return {"status": "ok", "message": f"Auth works! User: {user.email}"}
