from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api import api

# --- STUBS FOR STEP-BY-STEP RESTORE ---
async def stub_get_db():
    class FakeSession:
        async def execute(self, *args, **kwargs):
            # Return realistic halls if asked
            from sqlalchemy import select
            from app.models.hall import Hall
            stmt = args[0]
            if isinstance(stmt, type(select(Hall).order_by(Hall.id))):
                class Result:
                    def scalars(self): 
                        class Scalars:
                            def all(self): return [
                                Hall(id=1, name="Большой (STUB)", description="Restoring...", default_price=5000),
                                Hall(id=2, name="Малый (STUB)", description="Restoring...", default_price=3000),
                            ]
                        return Scalars()
                return Result()
            return self
        def scalars(self): return self
        def all(self): return []
        def scalar_one_or_none(self): return None
        async def commit(self): pass
        async def rollback(self): pass
        async def close(self): pass
    yield FakeSession()

async def stub_require_user():
    from app.models.user import User
    return User(id=1, email="stub@example.com", full_name="System Admin")

app = FastAPI(title="Event CRM (Staged Restore)")

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

@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok", "message": "STAGED RESTORE PHASE 1"}

app.include_router(api, prefix="/api")
