"""Telethon client: QR login, listening to chat, keyword/AI parsing, create deal on match."""
import asyncio
import json
import re
from typing import Callable, Awaitable
from app.config import get_settings

_settings = get_settings()
_client = None
_qr_login = None


async def get_telethon_client():
    global _client
    if _client is None and _settings.TELEGRAM_API_ID and _settings.TELEGRAM_API_HASH:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
        _client = TelegramClient(
            StringSession(),
            _settings.TELEGRAM_API_ID,
            _settings.TELEGRAM_API_HASH,
        )
        await _client.connect()
    return _client


async def get_qr_login_url() -> str | None:
    client = await get_telethon_client()
    if not client:
        return None
    global _qr_login
    try:
        _qr_login = await client.qr_login()
        return _qr_login.url
    except Exception:
        return None


async def wait_qr_login(timeout: int = 60) -> bool:
    global _qr_login
    if not _qr_login:
        return False
    try:
        await asyncio.wait_for(_qr_login.wait(), timeout=timeout)
        return True
    except asyncio.TimeoutError:
        return False
    except Exception:
        return False


async def disconnect_telethon():
    global _client
    if _client:
        await _client.disconnect()
        _client = None


def _matches_keywords(text: str, keywords: str) -> bool:
    if not keywords or not text:
        return False
    kw_list = [k.strip().lower() for k in keywords.split(",") if k.strip()]
    text_lower = text.lower()
    return any(k in text_lower for k in kw_list)


async def _ai_matches_context(text: str, prompt: str) -> bool:
    if not _settings.OPENAI_API_KEY or not prompt:
        return True
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=_settings.OPENAI_API_KEY)
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Сообщение: \"{text[:1500]}\"\nПодходит под контекст заявки на аренду/мероприятие? Ответь только yes или no."},
            ],
            max_tokens=10,
        )
        answer = (r.choices[0].message.content or "").strip().lower()
        return "yes" in answer or "да" in answer
    except Exception:
        return False


async def on_new_message_callback(chat_id: int, text: str, keywords: str | None, use_ai: bool, ai_prompt: str | None, create_deal_fn: Callable[[str, str], Awaitable[None]]):
    """Вызывается при новом сообщении в чате. Проверяет ключевые слова и AI контекст, создаёт сделку."""
    if keywords and not _matches_keywords(text, keywords):
        return
    if use_ai and ai_prompt and not await _ai_matches_context(text, ai_prompt):
        return
    await create_deal_fn(str(chat_id), text[:2000])
