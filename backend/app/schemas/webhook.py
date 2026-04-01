from pydantic import BaseModel, Field
from datetime import date, time
from typing import Optional

class BotBookingRequest(BaseModel):
    name: str = Field(..., description="Имя клиента")
    phone: str = Field(..., description="Номер телефона клиента (например, +79991234567)")
    tg_username: Optional[str] = Field(None, description="Telegram username без @")
    event_date: date = Field(..., description="Дата мероприятия YYYY-MM-DD")
    event_time_start: time = Field(..., description="Время начала HH:MM")
    event_time_end: time = Field(..., description="Время конца HH:MM")
    comments: Optional[str] = Field(None, description="Дополнительные пожелания/комментарии")
