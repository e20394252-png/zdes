from datetime import datetime
from pydantic import BaseModel


class FunnelStageCreate(BaseModel):
    name: str
    order: int = 0
    color: str | None = None
    is_won: bool = False
    is_lost: bool = False


class FunnelStageRead(BaseModel):
    id: int
    funnel_id: int
    name: str
    order: int
    color: str | None
    is_won: bool
    is_lost: bool

    class Config:
        from_attributes = True


class FunnelCreate(BaseModel):
    name: str
    is_default: bool = False
    stages: list[FunnelStageCreate] | None = None


class FunnelRead(BaseModel):
    id: int
    name: str
    is_default: bool
    created_at: datetime
    stages: list[FunnelStageRead] = []

    class Config:
        from_attributes = True
