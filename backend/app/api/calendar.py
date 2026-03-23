from datetime import date, time, datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models.deal import Deal
from app.models.hall import Hall
from app.core.deps import require_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/calendar", tags=["calendar"])


class Slot(BaseModel):
    hall_id: int
    hall_name: str
    date: date
    time_start: time
    time_end: time
    deal_id: int | None
    deal_title: str | None
    is_confirmed: bool  # deposit_paid


@router.get("/slots")
async def get_slots(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    hall_id: int | None = Query(None),
):
    """Возвращает слоты: занятые (сделки) и доступность залов."""
    q = select(Hall).where(Hall.is_active == True)
    if hall_id:
        q = q.where(Hall.id == hall_id)
    halls_result = await db.execute(q)
    halls = list(halls_result.scalars().all())

    q2 = select(Deal).where(
        Deal.event_date >= from_date,
        Deal.event_date <= to_date,
        Deal.hall_id.isnot(None),
    )
    if hall_id:
        q2 = q2.where(Deal.hall_id == hall_id)
    deals_result = await db.execute(q2)
    deals = list(deals_result.scalars().all())

    slots: list[Slot] = []
    for d in deals:
        if d.hall_id and d.event_date and d.event_time_start and d.event_time_end:
            hall = next((h for h in halls if h.id == d.hall_id), None)
            if hall:
                slots.append(
                    Slot(
                        hall_id=hall.id,
                        hall_name=hall.name,
                        date=d.event_date,
                        time_start=d.event_time_start,
                        time_end=d.event_time_end,
                        deal_id=d.id,
                        deal_title=d.title,
                        is_confirmed=d.deposit_paid,
                    )
                )
    return {"slots": [s.model_dump() for s in slots], "halls": [{"id": h.id, "name": h.name} for h in halls]}


@router.get("/availability")
async def check_availability(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    hall_id: int = Query(...),
    event_date: date = Query(...),
    time_start: time = Query(...),
    time_end: time = Query(...),
    exclude_deal_id: int | None = Query(None),
):
    """Проверка, свободен ли зал в указанный период."""
    q = select(Deal).where(
        Deal.hall_id == hall_id,
        Deal.event_date == event_date,
    )
    if exclude_deal_id:
        q = q.where(Deal.id != exclude_deal_id)
    result = await db.execute(q)
    deals = list(result.scalars().all())
    for d in deals:
        if d.event_time_start and d.event_time_end:
            # overlap check
            if not (time_end <= d.event_time_start or time_start >= d.event_time_end):
                return {"available": False, "conflict_with_deal_id": d.id}
    return {"available": True}
