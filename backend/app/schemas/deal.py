from datetime import datetime, date, time
from decimal import Decimal
from pydantic import BaseModel


class DealTaskCreate(BaseModel):
    title: str
    order: int = 0


class DealTaskRead(BaseModel):
    id: int
    deal_id: int
    title: str
    is_done: bool
    order: int

    class Config:
        from_attributes = True


class DealCreate(BaseModel):
    title: str
    contact_id: int | None = None
    funnel_id: int
    stage_id: int
    responsible_id: int | None = None
    hall_id: int | None = None
    event_date: date | None = None
    event_time_start: time | None = None
    event_time_end: time | None = None
    event_organizer_name: str | None = None
    rental_price: float = 0
    deposit_amount: float = 0
    participants_count: int | None = None
    comments: str | None = None
    extra_tasks: list[DealTaskCreate] | None = None


class DealUpdate(BaseModel):
    title: str | None = None
    contact_id: int | None = None
    stage_id: int | None = None
    responsible_id: int | None = None
    hall_id: int | None = None
    event_date: date | None = None
    event_time_start: time | None = None
    event_time_end: time | None = None
    event_organizer_name: str | None = None
    rental_price: float | None = None
    deposit_amount: float | None = None
    deposit_paid: bool | None = None
    participants_count: int | None = None
    comments: str | None = None


class DealRead(BaseModel):
    id: int
    title: str
    contact_id: int | None
    funnel_id: int
    stage_id: int
    responsible_id: int | None
    hall_id: int | None
    event_date: date | None
    event_time_start: time | None
    event_time_end: time | None
    event_organizer_name: str | None
    rental_price: Decimal
    deposit_amount: Decimal
    deposit_paid: bool
    participants_count: int | None
    comments: str | None
    source: str | None
    created_at: datetime
    extra_tasks: list[DealTaskRead] = []

    class Config:
        from_attributes = True
