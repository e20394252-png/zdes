from datetime import datetime
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    reminder_at: datetime | None = None
    deal_id: int | None = None
    assigned_to_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_done: bool | None = None
    reminder_at: datetime | None = None
    assigned_to_id: int | None = None


class TaskRead(BaseModel):
    id: int
    title: str
    description: str | None
    is_done: bool
    reminder_at: datetime | None
    reminder_sent: bool
    deal_id: int | None
    assigned_to_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True
