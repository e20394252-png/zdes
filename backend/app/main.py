import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import api
from app.config import get_settings
from app.database import AsyncSessionLocal, get_db
from app.models.user import User
from app.core.deps import require_user

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs",
    redoc_url="/redoc",
)

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
    return {
        "status": "ok", 
        "message": "Super-Safe Production server is LIVE",
        "db_configured": bool(settings.DATABASE_URL or os.environ.get("DATABASE_URL"))
    }

@app.get("/api/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database is reachable!"}
    except Exception as e:
        return {"status": "error", "message": f"DB unreachable: {e}"}
