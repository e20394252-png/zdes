from datetime import datetime
from pydantic import BaseModel


class FunnelStageCreate(BaseModel):
    name: str
    order: int = 0
    color: str | None = None
    is_won: bool = False
    is_lost: bool = False


class FunnelStageRead(BaseModel):
    id: int = 0
    funnel_id: int = 0
    name: str
    order: int = 0
    color: str | None = None
    is_won: bool = False
    is_lost: bool = False

    class Config:
        from_attributes = True


class FunnelCreate(BaseModel):
    name: str
    is_default: bool = False
    stages: list[FunnelStageCreate] | None = None


class FunnelRead(BaseModel):
    id: int = 0
    name: str
    is_default: bool = False
    created_at: datetime = datetime.now()
    stages: list[FunnelStageRead] = []

    class Config:
        from_attributes = True
