from datetime import datetime, date, time
from sqlalchemy import String, DateTime, Integer, Numeric, Text, Boolean, Date, Time, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500))
    contact_id: Mapped[int | None] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    funnel_id: Mapped[int] = mapped_column(ForeignKey("funnels.id", ondelete="RESTRICT"))
    stage_id: Mapped[int] = mapped_column(ForeignKey("funnel_stages.id", ondelete="RESTRICT"))
    responsible_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    hall_id: Mapped[int | None] = mapped_column(ForeignKey("halls.id", ondelete="SET NULL"), nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    event_time_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    event_time_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    event_organizer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    rental_price: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    deposit_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    deposit_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    participants_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)  # telegram, manual, etc.

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contact: Mapped["Contact | None"] = relationship("Contact", back_populates="deals")
    funnel: Mapped["Funnel"] = relationship("Funnel", back_populates="deals")
    stage: Mapped["FunnelStage"] = relationship("FunnelStage", back_populates="deals")
    responsible: Mapped["User | None"] = relationship("User", back_populates="deals", foreign_keys=[responsible_id])
    hall: Mapped["Hall | None"] = relationship("Hall", back_populates="deals")
    extra_tasks: Mapped[list["DealTask"]] = relationship("DealTask", back_populates="deal", cascade="all, delete-orphan")
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="deal", cascade="all, delete-orphan")


class DealTask(Base):
    __tablename__ = "deal_tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(500))
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    deal: Mapped["Deal"] = relationship("Deal", back_populates="extra_tasks")
