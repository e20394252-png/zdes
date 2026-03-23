from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api import api
from app.config import get_settings
from app.database import engine, Base
from app.models.user import User
from app.core.deps import require_user

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("DEBUG: Application starting up...")
    # Create tables if not exist
    try:
        async with engine.begin() as conn:
            print("DEBUG: Running migrations/table creation...")
            await conn.run_sync(Base.metadata.create_all)
            print("DEBUG: Migrations/table creation finished")
    except Exception as e:
        print(f"DEBUG: Table creation FAILED (but starting anyway): {e}")
        
    # Seed default funnel and admin if empty
    try:
        from app.seed import seed
        print("DEBUG: Starting seed()...")
        await seed()
        print("DEBUG: seed() finished")
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").warning("Initial seed failed: %s", e)
        print(f"DEBUG: seed() Exception: {e}")
    
    try:
        from app.seed import ensure_halls
        print("DEBUG: Starting ensure_halls()...")
        await ensure_halls()
        print("DEBUG: ensure_halls() finished")
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error("ensure_halls failed: %s", e)
        print(f"DEBUG: ensure_halls() Exception: {e}")
    
    # Check current hall count
    try:
        from app.database import AsyncSessionLocal
        from app.models.hall import Hall
        from sqlalchemy import select, func
        async with AsyncSessionLocal() as db:
            count = (await db.execute(select(func.count()).select_from(Hall))).scalar()
            print(f"DEBUG: Current hall count in DB: {count}")
    except Exception as e:
        print(f"DEBUG: Failed to check hall count: {e}")
        
    yield
    print("DEBUG: Application shutting down...")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://event-crm-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/test")
async def api_test():
    return {"status": "ok", "message": "API is reachable"}

@app.get("/api/test-auth")
async def api_test_auth(user: User = Depends(require_user)):
    return {"status": "ok", "message": f"Auth works! User: {user.email}"}
