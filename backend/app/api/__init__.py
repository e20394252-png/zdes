from fastapi import APIRouter
from . import settings # Keep only settings for Halls check

api = APIRouter()
# api.include_router(auth.router)
# api.include_router(dashboard.router)
# api.include_router(deals.router)
# api.include_router(contacts.router)
# api.include_router(tasks.router)
# api.include_router(calendar.router)
api.include_router(settings.router)
# api.include_router(telethon_routes.router)
