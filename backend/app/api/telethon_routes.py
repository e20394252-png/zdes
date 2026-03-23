"""API для авторизации Telethon через QR и управления парсингом чата."""
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.telethon_config import TelethonConfig
from app.core.deps import require_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/telethon", tags=["telethon"])


class QRResponse(BaseModel):
    url: str
    expires_in: int


@router.get("/qr", response_model=QRResponse)
async def get_qr_login(db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    """Возвращает URL для QR-кода авторизации Telegram (tg://login?token=...)."""
    try:
        from app.services.telethon_client import get_qr_login_url
        url = await get_qr_login_url()
        if not url:
            raise HTTPException(status_code=503, detail="Telethon client not ready")
        return QRResponse(url=url, expires_in=60)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/authorize")
async def confirm_authorized(db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    """Вызвать после успешной авторизации по QR (клиент помечает is_authorized)."""
    result = await db.execute(select(TelethonConfig).limit(1))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = TelethonConfig()
        db.add(cfg)
        await db.flush()
    cfg.is_authorized = True
    await db.flush()
    return {"ok": True}


@router.post("/logout")
async def telethon_logout(db: AsyncSession = Depends(get_db), user: User = Depends(require_user)):
    """Сброс сессии Telethon."""
    try:
        from app.services.telethon_client import disconnect_telethon
        await disconnect_telethon()
        result = await db.execute(select(TelethonConfig).limit(1))
        cfg = result.scalar_one_or_none()
        if cfg:
            cfg.is_authorized = False
            await db.flush()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
