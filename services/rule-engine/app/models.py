import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import SCHEMA, Base


class SafetyRule(Base):
    """Prototype deterministic rules for synthetic academic evaluation only —
    NOT clinically validated. See explanation_template, always rendered with
    that disclaimer in the UI."""

    __tablename__ = "safety_rules"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(1000))
    category: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(50))
    priority_category: Mapped[str] = mapped_column(String(50))
    version: Mapped[int] = mapped_column(Integer, default=1)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    conditions: Mapped[dict] = mapped_column(JSON)
    explanation_template: Mapped[str] = mapped_column(String(1000))
    required_action: Mapped[str] = mapped_column(String(300))
    source_note: Mapped[str] = mapped_column(
        String(300), default="Prototype rule for academic evaluation. Not clinically validated."
    )
    approval_status: Mapped[str] = mapped_column(String(50), default="approved_for_prototype")
    created_by: Mapped[str] = mapped_column(String(100), default="system-seed")
    approved_by: Mapped[str] = mapped_column(String(100), default="system-seed")
    created_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    effective_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
