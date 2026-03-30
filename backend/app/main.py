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
from app.database import get_db, get_engine, RescueSession, create_tables
from app.seed import seed

@app.on_event("startup")
async def on_startup():
    print("STARTUP: Initializing database...")
    try:
        from app.config import get_settings
        settings = get_settings()
        url = settings.sqlalchemy_database_url
        
        # Mask the URL for safe logging
        masked_url = "None"
        if url:
            if "@" in url:
                masked_url = url.split("://")[0] + "://***:***@" + url.split("@", 1)[1]
            else:
                masked_url = url
        print(f"DEBUG: Attempting to connect to DB: {masked_url}")
        
        await create_tables()
        await seed()
        print("STARTUP: Database initialized successfully.")
    except Exception as e:
        print(f"STARTUP ERROR: Could not initialize database. Error: {e}")
        print("WARNING: Application started, but database is NOT available. This usually means the Render Database is suspended, deleted, or the hostname is invalid in DATABASE_URL.")

@app.get("/health")
@app.get("/api/health")
async def health():
    """Health check that reflects real DB status."""
    engine = get_engine()
    resilient_mode = False
    error_msg = None
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        error_msg = str(e)
        print(f"HEALTH CHECK FAILURE: {error_msg}")
        resilient_mode = True
        
    return {
        "status": "ok" if not resilient_mode else "degraded", 
        "message": "Production server is LIVE",
        "resilient_mode": resilient_mode
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
    from app.config import get_settings
    settings = get_settings()
    url = settings.sqlalchemy_database_url
    
    # Mask URL for security
    masked_url = "None"
    if url:
        if "@" in url:
            prefix, rest = url.split("@", 1)
            masked_url = f"{prefix.split(':')[0]}://***:***@{rest.split(':')[0]}..."
        else:
            masked_url = url
            
    return {
        "database_url_configured": bool(url),
        "database_url_masked": masked_url,
        "is_sqlite": "sqlite" in url.lower() if url else False,
        "is_postgres": "postgres" in url.lower() if url else False,
        "database_url_type": "internal" if os.getenv("RENDER_POSTGRES_INTERNAL_URL") else "external",
        "env_stage": os.getenv("RENDER_EXTERNAL_HOSTNAME", "local"),
    }

# Include all real routes
app.include_router(api, prefix="/api")

# Startup check (non-blocking)
@app.on_event("startup")
async def startup_event():
    print("DEBUG: Application started")
