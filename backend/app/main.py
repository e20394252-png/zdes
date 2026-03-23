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
    async def run_migrations_and_seed():
        import asyncio
        from app.database import engine, Base
        from app.seed import seed, ensure_halls
        try:
            async with engine.begin() as conn:
                print("DEBUG: Running migrations/table creation...")
                await conn.run_sync(Base.metadata.create_all)
                print("DEBUG: Migrations finished")
            
            print("DEBUG: Running secondary startup tasks...")
            await seed()
            await ensure_halls()
            print("DEBUG: Startup tasks finished")
        except Exception as e:
            print(f"DEBUG: Startup tasks FAILED: {e}")

    # Fire and forget if needed, but simple non-blocking is better
    import asyncio
    asyncio.create_task(run_migrations_and_seed())
    
    yield
    print("DEBUG: Application shutting down...")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)
# --- Manual CORS Middleware ---
@app.middleware("http")
async def add_cors_header(request, call_next):
    if request.method == "OPTIONS":
        from fastapi import Response
        response = Response()
    else:
        response = await call_next(request)
    
    origin = request.headers.get("origin")
    if origin in [
        "https://event-crm-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:4173"
    ]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        response.headers["Access-Control-Max-Age"] = "86400"
    
    return response

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
