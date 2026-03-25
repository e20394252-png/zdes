from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.settings import debug_log
from app.models.deal import Deal, DealTask
from app.models.contact import Contact
from app.models.funnel import FunnelStage
from app.models.invoice import Invoice
from app.schemas.deal import DealCreate, DealUpdate, DealRead, DealTaskCreate, DealTaskRead
from app.core.deps import require_user
from app.models.user import User
from datetime import datetime

router = APIRouter(prefix="/deals", tags=["deals"])


def _invoice_number() -> str:
    return f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{datetime.utcnow().microsecond}"


@router.get("", response_model=list[DealRead])
async def list_deals(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    funnel_id: int | None = Query(None),
    stage_id: int | None = Query(None),
):
    q = select(Deal).options(selectinload(Deal.stage), selectinload(Deal.contact), selectinload(Deal.extra_tasks))
    if funnel_id:
        q = q.where(Deal.funnel_id == funnel_id)
    if stage_id:
        q = q.where(Deal.stage_id == stage_id)
    q = q.order_by(Deal.updated_at.desc())
    result = await db.execute(q)
    return list(result.scalars().unique().all())


@router.get("/{deal_id}", response_model=DealRead)
async def get_deal(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(
        select(Deal)
        .options(selectinload(Deal.stage), selectinload(Deal.contact), selectinload(Deal.extra_tasks))
        .where(Deal.id == deal_id)
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.post("", response_model=DealRead, status_code=status.HTTP_201_CREATED)
async def create_deal(
    data: DealCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    auto_invoice: bool = Query(True),
):
    debug_log(f"Creating deal: {data.title}, hall={data.hall_id}, date={data.event_date}, time={data.event_time_start}-{data.event_time_end}")
    deal = Deal(
        title=data.title,
        contact_id=data.contact_id,
        funnel_id=data.funnel_id,
        stage_id=data.stage_id,
        responsible_id=data.responsible_id or user.id,
        hall_id=data.hall_id,
        event_date=data.event_date,
        event_time_start=data.event_time_start,
        event_time_end=data.event_time_end,
        event_organizer_name=data.event_organizer_name,
        rental_price=data.rental_price,
        deposit_amount=data.deposit_amount,
        participants_count=data.participants_count,
        comments=data.comments,
    )
    db.add(deal)
    await db.flush()
    if data.extra_tasks:
        for t in data.extra_tasks:
            db.add(DealTask(deal_id=deal.id, title=t.title, order=t.order))
    if auto_invoice and data.rental_price:
        inv = Invoice(
            deal_id=deal.id,
            number=_invoice_number(),
            amount=data.rental_price,
            description=f"Аренда зала, сделка #{deal.id}",
        )
        db.add(inv)
    await db.commit()
    await db.refresh(deal)
    result = await db.execute(select(Deal).where(Deal.id == deal.id).options(selectinload(Deal.stage), selectinload(Deal.contact), selectinload(Deal.extra_tasks)))
    debug_log(f"Deal created successfully, ID={deal.id}")
    return result.scalar_one()


@router.patch("/{deal_id}", response_model=DealRead)
async def update_deal(
  deal_id: int,
  data: DealUpdate,
  db: AsyncSession = Depends(get_db),
  user: User = Depends(require_user),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id).options(selectinload(Deal.stage), selectinload(Deal.contact), selectinload(Deal.extra_tasks)))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(deal, k, v)
    await db.flush()
    await db.commit()
    await db.refresh(deal)
    return deal


@router.patch("/{deal_id}/stage")
async def move_deal_stage(
    deal_id: int,
    stage_id: int = Query(..., description="ID этапа воронки"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    stage_result = await db.execute(select(FunnelStage).where(FunnelStage.id == stage_id))
    new_stage = stage_result.scalar_one_or_none()
    deal.stage_id = stage_id
    if new_stage and new_stage.is_won and deal.contact_id:
        contact_result = await db.execute(select(Contact).where(Contact.id == deal.contact_id))
        contact = contact_result.scalar_one_or_none()
        if contact:
            contact.total_events_count = (contact.total_events_count or 0) + 1
            contact.total_amount = (contact.total_amount or 0) + float(deal.rental_price)
    await db.flush()
    await db.commit()
    return {"ok": True, "stage_id": stage_id}


@router.post("/{deal_id}/invoice")
async def create_invoice(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    inv = Invoice(
        deal_id=deal.id,
        number=_invoice_number(),
        amount=float(deal.rental_price),
        description=f"Аренда зала, сделка #{deal.id}",
    )
    db.add(inv)
    await db.flush()
    await db.commit()
    await db.refresh(inv)
    return {"id": inv.id, "number": inv.number, "amount": float(inv.amount)}
