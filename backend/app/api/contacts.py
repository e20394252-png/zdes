from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.contact import Contact
from app.schemas.contact import ContactCreate, ContactUpdate, ContactRead
from app.core.deps import require_user
from app.models.user import User

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactRead])
async def list_contacts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
    search: str | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
):
    q = select(Contact).order_by(Contact.updated_at.desc()).limit(limit).offset(offset)
    if search:
        q = q.where(
            or_(
                Contact.name.ilike(f"%{search}%"),
                Contact.company.ilike(f"%{search}%"),
                Contact.email.ilike(f"%{search}%"),
                Contact.phone.ilike(f"%{search}%"),
            )
        )
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/{contact_id}", response_model=ContactRead)
async def get_contact(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.post("", response_model=ContactRead, status_code=201)
async def create_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    contact = Contact(**data.model_dump())
    db.add(contact)
    await db.flush()
    await db.commit()
    await db.refresh(contact)
    return contact


@router.patch("/{contact_id}", response_model=ContactRead)
async def update_contact(
    contact_id: int,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(contact, k, v)
    await db.flush()
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_user),
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(contact)
    await db.flush()
    await db.commit()
