from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.user import User
from app.models.funnel import Funnel, FunnelStage
from app.models.hall import Hall, HallPrice, HallAvailability
from app.models.telethon_config import TelethonConfig
from app.schemas.funnel import FunnelCreate, FunnelRead, FunnelStageCreate
from app.schemas.hall import HallCreate, HallUpdate, HallRead, HallAvailabilityCreate
from app.schemas.user import UserCreate, UserRead
from app.core.deps import require_user
from app.core.security import get_password_hash
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["settings"])


# --- Funnels ---
@router.get("/funnels", response_model=list[FunnelRead])
async def list_funnels(db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    result = await db.execute(select(Funnel).options(selectinload(Funnel.stages)).order_by(Funnel.id))
    funnels = result.scalars().unique().all()
    return list(funnels)


@router.post("/funnels", response_model=FunnelRead, status_code=201)
async def create_funnel(data: FunnelCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    funnel = Funnel(name=data.name, is_default=data.is_default)
    db.add(funnel)
    await db.flush()
    if data.stages:
        for s in data.stages:
            db.add(FunnelStage(funnel_id=funnel.id, name=s.name, order=s.order, color=s.color, is_won=s.is_won, is_lost=s.is_lost))
    if data.is_default:
        await db.execute(update(Funnel).where(Funnel.id != funnel.id).values(is_default=False))
    await db.commit()
    await db.refresh(funnel)
    result = await db.execute(select(Funnel).options(selectinload(Funnel.stages)).where(Funnel.id == funnel.id))
    return result.scalar_one()


@router.patch("/funnels/{funnel_id}", response_model=FunnelRead)
async def update_funnel(funnel_id: int, data: dict, db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    result = await db.execute(select(Funnel).options(selectinload(Funnel.stages)).where(Funnel.id == funnel_id))
    funnel = result.scalar_one_or_none()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    if "name" in data:
        funnel.name = data["name"]
    if data.get("is_default"):
        await db.execute(update(Funnel).where(Funnel.id != funnel_id).values(is_default=False))
        funnel.is_default = True
    await db.commit()
    await db.refresh(funnel)
    result = await db.execute(select(Funnel).options(selectinload(Funnel.stages)).where(Funnel.id == funnel_id))
    return result.scalar_one()


# --- Halls ---
@router.get("/halls", response_model=list[HallRead])
async def list_halls(db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    result = await db.execute(select(Hall).order_by(Hall.id))
    return list(result.scalars().all())


@router.post("/halls", response_model=HallRead, status_code=201)
async def create_hall(data: HallCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    hall = Hall(name=data.name, description=data.description, default_price=data.default_price)
    db.add(hall)
    await db.flush()
    if data.availability:
        for a in data.availability:
            db.add(HallAvailability(hall_id=hall.id, day_of_week=a.day_of_week, start_time=a.start_time, end_time=a.end_time, is_available=a.is_available))
    await db.commit()
    await db.refresh(hall)
    return hall


@router.patch("/halls/{hall_id}", response_model=HallRead)
async def update_hall(hall_id: int, data: HallUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    result = await db.execute(select(Hall).where(Hall.id == hall_id))
    hall = result.scalar_one_or_none()
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(hall, k, v)
    await db.commit()
    await db.refresh(hall)
    return hall


# --- Managers (users) ---
@router.get("/managers", response_model=list[UserRead])
async def list_managers(db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    result = await db.execute(select(User).where(User.is_active == True).order_by(User.full_name))
    return list(result.scalars().all())


@router.post("/managers", response_model=UserRead, status_code=201)
async def create_manager(data: UserCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    from app.models.user import UserRole
    existing = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    u = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=data.role,
        telegram_user_id=data.telegram_user_id,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


# --- Telethon ---
class TelethonConfigUpdate(BaseModel):
    chat_id: str | None = None
    chat_title: str | None = None
    keywords: str | None = None
    use_ai_context: bool | None = None
    ai_prompt: str | None = None
    funnel_id: int | None = None


@router.get("/telethon")
async def get_telethon_config(db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    result = await db.execute(select(TelethonConfig).limit(1))
    cfg = result.scalar_one_or_none()
    if not cfg:
        return {"is_authorized": False}
    return {
        "id": cfg.id,
        "is_authorized": cfg.is_authorized,
        "chat_id": cfg.chat_id,
        "chat_title": cfg.chat_title,
        "keywords": cfg.keywords,
        "use_ai_context": cfg.use_ai_context,
        "ai_prompt": cfg.ai_prompt,
        "funnel_id": cfg.funnel_id,
    }


@router.patch("/telethon")
async def update_telethon_config(data: TelethonConfigUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    result = await db.execute(select(TelethonConfig).limit(1))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = TelethonConfig()
        db.add(cfg)
        await db.flush()
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cfg, k, v)
    await db.commit()
@router.get("/seed-halls")
@router.post("/seed-halls")
async def seed_halls_manual(db: AsyncSession = Depends(get_db)):
    from app.seed import ensure_halls
    print("DEBUG: Manual seed-halls triggered")
    await ensure_halls()
    return {"status": "ok", "message": "Halls ensured"}


@router.get("/halls/count")
async def get_halls_count(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    count = (await db.execute(select(func.count()).select_from(Hall))).scalar()
    return {"count": count}
