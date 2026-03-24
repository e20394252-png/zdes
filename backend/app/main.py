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

# Debug Middleware to ensure headers are present
@app.middleware("http")
async def add_cors_debug_header(request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

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
