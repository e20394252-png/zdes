from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.config import get_settings
from app.schemas.webhook import BotBookingRequest
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.funnel import Funnel, FunnelStage
from app.models.hall import Hall
from app.core.logging import debug_log

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    settings = get_settings()
    if credentials.credentials != settings.BOT_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret token",
        )
    return True

@router.post("/bot-booking", status_code=status.HTTP_201_CREATED)
async def create_booking_from_bot(
    data: BotBookingRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_token)
):
    debug_log(f"Received webhook bot-booking: {data.name}, {data.phone}, {data.event_date}")

    # 1. Найти или создать Контакт по телефону
    result = await db.execute(select(Contact).where(Contact.phone == data.phone))
    contact = result.scalar_one_or_none()
    
    if not contact:
        contact = Contact(
            name=data.name,
            phone=data.phone,
            telegram_username=data.tg_username,
        )
        db.add(contact)
        await db.flush()
    else:
        # Обновим имя или тг юзернейм если они пустые
        if not contact.telegram_username and data.tg_username:
            contact.telegram_username = data.tg_username
        if contact.name.lower() in ("без имени", "неизвестно") and data.name:
            contact.name = data.name

    # 2. Найти дефолтный Зал (первый доступный)
    hall_result = await db.execute(select(Hall).limit(1))
    hall = hall_result.scalar_one_or_none()
    hall_id = hall.id if hall else None

    # 3. Найти дефолтную Воронку и Этап (т.к. БД требует их)
    funnel_result = await db.execute(select(Funnel).limit(1))
    funnel = funnel_result.scalar_one_or_none()
    
    stage_id = None
    funnel_id = None
    
    if not funnel:
        # Если вдруг воронки вообще нет (что вряд ли), создадим базовую
        funnel = Funnel(title="Основная", color="blue")
        db.add(funnel)
        await db.flush()
        stage = FunnelStage(funnel_id=funnel.id, title="Новые заявки", order=0, color="gray")
        db.add(stage)
        await db.flush()
        funnel_id = funnel.id
        stage_id = stage.id
    else:
        funnel_id = funnel.id
        stage_result = await db.execute(select(FunnelStage).where(FunnelStage.funnel_id == funnel.id).order_by(FunnelStage.order).limit(1))
        stage = stage_result.scalar_one_or_none()
        if stage:
            stage_id = stage.id
        else:
            # Воронка есть, но без этапов (аномалия, но починим)
            stage = FunnelStage(funnel_id=funnel.id, title="Новая заявка", order=0, color="gray")
            db.add(stage)
            await db.flush()
            stage_id = stage.id

    # 4. Создать Сделку (Бронирование)
    # Формируем красивое название сделки
    deal_title = f"[Бот] Мероприятие {data.event_date.strftime('%d.%m.%Y')} {data.event_time_start.strftime('%H:%M')}"
    
    deal = Deal(
        title=deal_title,
        contact_id=contact.id,
        funnel_id=funnel_id,
        stage_id=stage_id,
        responsible_id=None, # Без конкретного ответственного
        hall_id=hall_id,
        event_date=data.event_date,
        event_time_start=data.event_time_start,
        event_time_end=data.event_time_end,
        comments=data.comments,
        source="telegram_bot"
    )
    
    db.add(deal)
    await db.flush()
    await db.commit()
    
    return {"status": "ok", "deal_id": deal.id, "contact_id": contact.id, "message": "Booking successfully created in CRM grid"}
