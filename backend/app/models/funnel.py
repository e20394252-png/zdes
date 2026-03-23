from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Funnel(Base):
    __tablename__ = "funnels"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    is_default: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stages: Mapped[list["FunnelStage"]] = relationship("FunnelStage", back_populates="funnel", order_by="FunnelStage.order")
    deals: Mapped[list["Deal"]] = relationship("Deal", back_populates="funnel")


class FunnelStage(Base):
    __tablename__ = "funnel_stages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    funnel_id: Mapped[int] = mapped_column(ForeignKey("funnels.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_won: Mapped[bool] = mapped_column(default=False)
    is_lost: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    funnel: Mapped["Funnel"] = relationship("Funnel", back_populates="stages")
    deals: Mapped[list["Deal"]] = relationship("Deal", back_populates="stage")
