from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.EMPLOYEE
    telegram_user_id: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    telegram_user_id: str | None = None
    is_active: bool | None = None


class UserRead(BaseModel):
    id: int = 0
    email: str
    full_name: str
    role: UserRole
    telegram_user_id: str | None = None
    is_active: bool = True

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
