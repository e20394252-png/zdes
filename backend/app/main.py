import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api

app = FastAPI(
    title="Event CRM (Production)",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Production CORS config
origins = [
    "https://event-crm-frontend.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text
from app.database import get_db, get_engine, RescueSession

@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "ok", 
        "message": "Production server is LIVE",
        "resilient_mode": True
    }

@app.get("/api/health/postgres")
async def check_postgres():
    """Detailed diagnostics that bypasses RescueSession mask."""
    engine = get_engine()
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return {"status": "connected", "result": result.scalar()}
    except Exception as e:
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "error_message": str(e),
            "hint": "Check DATABASE_URL and Render environment variables."
        }

@app.get("/api/health/diagnostics")
async def full_diagnostics():
    """System-wide health check including environment."""
    return {
        "database_url_configured": bool(os.getenv("DATABASE_URL") or os.getenv("RENDER_POSTGRES_INTERNAL_URL")),
        "database_url_type": "internal" if os.getenv("RENDER_POSTGRES_INTERNAL_URL") else "external",
        "env_stage": os.getenv("RENDER_EXTERNAL_HOSTNAME", "local"),
    }

# Include all real routes
app.include_router(api, prefix="/api")

# Startup check (non-blocking)
@app.on_event("startup")
async def startup_event():
    print("DEBUG: Application started in Resilient Mode")
