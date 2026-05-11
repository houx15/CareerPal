from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import new_uuid


class GrowthPlan(Base):
    __tablename__ = "growth_plans"
    __table_args__ = (UniqueConstraint("user_id", name="uq_growth_plans_user_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    nodes: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class GrowthProgressLog(Base):
    __tablename__ = "growth_progress_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    growth_plan_id: Mapped[str] = mapped_column(ForeignKey("growth_plans.id"), index=True, nullable=False)
    node_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    node_label: Mapped[str] = mapped_column(String(160), nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    quality_delta: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
