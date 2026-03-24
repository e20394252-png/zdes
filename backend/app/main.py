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
    try:
        response = await call_next(request)
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR: {str(e)}")
        print(traceback.format_exc())
        from fastapi.responses import JSONResponse
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(e), "traceback": traceback.format_exc()}
        )
    
    origin = request.headers.get("origin")
    if origin in origins or "*" in origins:
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

from fastapi.exception_handlers import http_exception_handler
from fastapi import HTTPException
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": "Global Exception caught", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true"
        }
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
