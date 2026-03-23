from datetime import datetime, time
from sqlalchemy import String, DateTime, Integer, Numeric, Boolean, Time, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Hall(Base):
    __tablename__ = "halls"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    default_price: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    prices: Mapped[list["HallPrice"]] = relationship("HallPrice", back_populates="hall")
    availability: Mapped[list["HallAvailability"]] = relationship("HallAvailability", back_populates="hall")
    deals: Mapped[list["Deal"]] = relationship("Deal", back_populates="hall")


class HallPrice(Base):
    __tablename__ = "hall_prices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hall_id: Mapped[int] = mapped_column(ForeignKey("halls.id", ondelete="CASCADE"))
    price: Mapped[float] = mapped_column(Numeric(14, 2))
    valid_from: Mapped[datetime] = mapped_column(DateTime)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    hall: Mapped["Hall"] = relationship("Hall", back_populates="prices")


class HallAvailability(Base):
    __tablename__ = "hall_availability"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hall_id: Mapped[int] = mapped_column(ForeignKey("halls.id", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0-6 Monday-Sunday
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    is_available: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    hall: Mapped["Hall"] = relationship("Hall", back_populates="availability")
