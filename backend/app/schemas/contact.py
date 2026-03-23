from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal


class ContactCreate(BaseModel):
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    telegram_username: str | None = None
    notes: str | None = None


class ContactUpdate(BaseModel):
    name: str | None = None
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    telegram_username: str | None = None
    notes: str | None = None


class ContactRead(BaseModel):
    id: int
    name: str
    company: str | None
    email: str | None
    phone: str | None
    telegram_username: str | None
    notes: str | None
    total_events_count: int
    total_amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True
