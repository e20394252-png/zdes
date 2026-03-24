from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Minimal CRM API (Recovery)")

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
    return {"status": "ok", "message": "RECOVERY MODE ACTIVE"}

@app.get("/api/settings/halls")
async def dummy_halls():
    return [
        {"id": 1, "name": "Minimal Hall (RECOVERY)", "description": "Backend is stabilizing...", "default_price": 1000}
    ]

# No other imports, no DB, no Redis, NO CRASHES.
