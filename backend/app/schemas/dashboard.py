from pydantic import BaseModel
from decimal import Decimal


class FunnelStageStats(BaseModel):
    stage_id: int
    stage_name: str
    count: int


class ManagerStats(BaseModel):
    user_id: int
    full_name: str
    deals_count: int
    won_count: int
    total_amount: Decimal


class DashboardStats(BaseModel):
    deals_total: int
    deals_won: int
    deals_lost: int
    conversion_percent: float
    revenue_total: Decimal
    funnel_stages: list[FunnelStageStats]
    by_managers: list[ManagerStats]
