from fastapi import APIRouter
from app.api import auth, dashboard, deals, contacts, tasks, calendar, settings, telethon_routes

api = APIRouter()
api.include_router(auth.router)
api.include_router(dashboard.router)
api.include_router(deals.router)
api.include_router(contacts.router)
api.include_router(tasks.router)
api.include_router(calendar.router)
api.include_router(settings.router)
api.include_router(telethon_routes.router)
