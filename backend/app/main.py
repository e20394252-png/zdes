import os
from fastapi import FastAPI, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import api
from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.core.deps import require_user

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Global CORS - Permissive for diagnostic phase
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route for Render health checks
@app.get("/")
async def root():
    return {"status": "ok", "message": "Backend is alive!"}

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "message": "Super-Safe Production server is LIVE",
        "env": os.environ.get("RENDER_EXTERNAL_URL", "unknown")
    }

app.include_router(api, prefix="/api")

# Global Exception Handler to prevent crashes
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"DEBUG: GLOBAL ERROR: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": f"Internal crash: {str(exc)}"}
    )

@app.get("/api/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database is reachable!"}
    except Exception as e:
        return {"status": "error", "message": f"DB unreachable: {e}"}
