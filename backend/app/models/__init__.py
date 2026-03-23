from app.models.user import User, UserRole
from app.models.contact import Contact
from app.models.deal import Deal, DealTask
from app.models.funnel import Funnel, FunnelStage
from app.models.hall import Hall, HallPrice, HallAvailability
from app.models.task import Task
from app.models.invoice import Invoice
from app.models.telethon_config import TelethonConfig

__all__ = [
    "User",
    "UserRole",
    "Contact",
    "Deal",
    "DealTask",
    "Funnel",
    "FunnelStage",
    "Hall",
    "HallPrice",
    "HallAvailability",
    "Task",
    "Invoice",
    "TelethonConfig",
]
