"""Отправка напоминаний по задачам в Telegram."""
import asyncio
from datetime import datetime
from sqlalchemy import select
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.task import Task
from app.models.user import User

_settings = get_settings()


async def send_telegram_reminder(user_telegram_id: str, task_title: str, task_id: int):
    if not _settings.TELEGRAM_BOT_TOKEN:
        return
    try:
        import httpx
        url = f"https://api.telegram.org/bot{_settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        text = f"Напоминание: {task_title}\nЗадача #{task_id}"
        async with httpx.AsyncClient() as client:
            await client.post(url, json={"chat_id": user_telegram_id, "text": text})
    except Exception:
        pass


async def check_and_send_reminders():
    """Периодически проверяет задачи с reminder_at и отправляет уведомления в Telegram."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.utcnow()
                result = await db.execute(
                    select(Task, User)
                    .join(User, Task.assigned_to_id == User.id)
                    .where(
                        Task.reminder_at <= now,
                        Task.reminder_sent == False,
                        Task.is_done == False,
                        User.telegram_user_id.isnot(None),
                    )
                )
                rows = result.all()
                for task, user in rows:
                    await send_telegram_reminder(user.telegram_user_id, task.title, task.id)
                    task.reminder_sent = True
                await db.commit()
        except Exception:
            pass
        await asyncio.sleep(60)
