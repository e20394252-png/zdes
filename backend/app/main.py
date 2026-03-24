import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api

app = FastAPI(
    title="Event CRM (Production)",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Global CORS
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
    return {"status": "ok", "message": "Production server is LIVE (Resilient Mode)"}

# Include all real routes
app.include_router(api, prefix="/api")

# Startup check (non-blocking)
@app.on_event("startup")
async def startup_event():
    print("DEBUG: Application started in Resilient Mode")
