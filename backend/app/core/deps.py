from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme),
) -> User | None:
    try:
        # BYPASS AUTH: Return first active user (admin)
        from sqlalchemy import select
        from app.models.user import User
        result = await db.execute(select(User).where(User.is_active == True).order_by(User.id).limit(1))
        user = result.scalar_one_or_none()
        if user:
            return user
            
        # If no user found in DB, return a hardcoded system user
        return User(id=1, email="system@example.com", full_name="System Admin", is_active=True)
    except Exception as e:
        print(f"DEBUG: Auth Bypass Error: {e}")
        from app.models.user import User
        return User(id=1, email="system@example.com", full_name="System Admin", is_active=True)


async def require_user(user: User | None = Depends(get_current_user)) -> User:
    if not user:
        from app.models.user import User
        return User(id=1, email="system@example.com", full_name="System Admin", is_active=True)
    return user
