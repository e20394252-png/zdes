from datetime import datetime, time
from pydantic import BaseModel
from decimal import Decimal


class HallAvailabilityCreate(BaseModel):
    day_of_week: int
    start_time: time
    end_time: time
    is_available: bool = True


class HallCreate(BaseModel):
    name: str
    description: str | None = None
    default_price: float = 0
    availability: list[HallAvailabilityCreate] | None = None


class HallUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    default_price: float | None = None


class HallRead(BaseModel):
    id: int = 0
    name: str
    description: str | None = None
    is_active: bool = True
    default_price: Decimal = Decimal("0")
    created_at: datetime = datetime.now()

    class Config:
        from_attributes = True
