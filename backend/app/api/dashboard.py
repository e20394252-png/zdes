from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.deal import Deal
from app.models.user import User
from app.models.funnel import FunnelStage
from app.schemas.dashboard import DashboardStats, FunnelStageStats, ManagerStats
from app.core.deps import require_user
from decimal import Decimal

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    days: int = Query(30, ge=1, le=365),
):
    since = datetime.utcnow() - timedelta(days=days)

    q = (
        select(Deal)
        .options(selectinload(Deal.stage))
        .where(Deal.created_at >= since)
    )
    result = await db.execute(q)
    deals = list(result.scalars().unique().all())

    total = len(deals)
    won = [d for d in deals if d.stage and d.stage.is_won]
    lost = [d for d in deals if d.stage and d.stage.is_lost]
    won_count = len(won)
    conversion = (won_count / total * 100) if total else 0
    revenue = sum(Decimal(str(d.rental_price)) for d in won)

    stage_counts: dict[int, int] = {}
    for d in deals:
        if d.stage_id:
            stage_counts[d.stage_id] = stage_counts.get(d.stage_id, 0) + 1

    stage_ids = list(stage_counts.keys())
    if stage_ids:
        stages_result = await db.execute(
            select(FunnelStage).where(FunnelStage.id.in_(stage_ids))
        )
        stages_map = {s.id: s for s in stages_result.scalars().all()}
        funnel_stages = [
            FunnelStageStats(
                stage_id=sid,
                stage_name=stages_map[sid].name,
                count=stage_counts[sid],
            )
            for sid in stage_ids
        ]
        funnel_stages.sort(key=lambda x: stages_map.get(x.stage_id) and stages_map[x.stage_id].order or 0)
    else:
        funnel_stages = []

    manager_ids = {d.responsible_id for d in deals if d.responsible_id}
    if manager_ids:
        users_result = await db.execute(select(User).where(User.id.in_(manager_ids)))
        users_map = {u.id: u for u in users_result.scalars().all()}
    else:
        users_map = {}

    by_manager: dict[int, dict] = {}
    for d in deals:
        uid = d.responsible_id or 0
        if uid not in by_manager:
            by_manager[uid] = {"count": 0, "won": 0, "amount": Decimal(0)}
        by_manager[uid]["count"] += 1
        if d.stage and d.stage.is_won:
            by_manager[uid]["won"] += 1
            by_manager[uid]["amount"] += Decimal(str(d.rental_price))

    by_managers = [
        ManagerStats(
            user_id=uid,
            full_name=users_map.get(uid).full_name if uid in users_map else "Не назначен",
            deals_count=by_manager[uid]["count"],
            won_count=by_manager[uid]["won"],
            total_amount=by_manager[uid]["amount"],
        )
        for uid in manager_ids
        if uid in by_manager
    ]

    return DashboardStats(
        deals_total=total,
        deals_won=won_count,
        deals_lost=len(lost),
        conversion_percent=round(conversion, 1),
        revenue_total=revenue,
        funnel_stages=funnel_stages,
        by_managers=by_managers,
    )
