from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Event CRM API")

# Absolute minimal permissive CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Server is UP and minimal!"}

@app.get("/api/test")
async def api_test():
    return {"status": "ok", "message": "API reachable!"}

@app.get("/api/settings/halls")
async def dummy_halls():
    # Return dummy data to test the path and CORS without DB
    return [
        {"id": 1, "name": "Minimal Hall 1", "description": "No DB connection yet", "default_price": 0},
        {"id": 2, "name": "Minimal Hall 2", "description": "Testing port binding", "default_price": 0}
    ]
