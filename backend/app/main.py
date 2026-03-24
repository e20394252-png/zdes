from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api import api

# --- STUBS FOR DIAGNOSTICS ---
async def stub_get_db():
    # Return nothing, just to satisfy the type
    class FakeSession:
        async def execute(self, *args, **kwargs): return self
        def scalars(self): return self
        def all(self): return []
        def scalar_one_or_none(self): return None
        async def commit(self): pass
        async def rollback(self): pass
        async def close(self): pass
    yield FakeSession()

async def stub_require_user():
    # Return a dummy user
    from app.models.user import User
    return User(id=1, email="stub@example.com", full_name="Stub User")

app = FastAPI(title="Event CRM API (Stubbed)")

# Override dependencies globally
from app.database import get_db
from app.core.deps import require_user
app.dependency_overrides[get_db] = stub_get_db
app.dependency_overrides[require_user] = stub_require_user

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
    return {"status": "ok", "message": "Stubbed production server is UP"}
