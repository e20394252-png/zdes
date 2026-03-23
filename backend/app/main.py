from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api
from app.config import get_settings
from app.database import engine, Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed default funnel and admin if empty
    try:
        from app.seed import seed
        await seed()
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").warning("Initial seed skipped or failed: %s", e)
    
    try:
        from app.seed import ensure_halls
        await ensure_halls()
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").error("ensure_halls failed: %s", e)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
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
app.include_router(api)


@app.get("/health")
async def health():
    return {"status": "ok"}
