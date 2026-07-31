import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import SCHEMA, Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), unique=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    accessibility_notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ConsentRecord(Base):
    __tablename__ = "consent_records"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.patient_profiles.id"))
    consent_type: Mapped[str] = mapped_column(String(100), default="synthetic_intake_and_ai_processing")
    granted: Mapped[bool] = mapped_column(Boolean, default=True)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AppointmentRequest(Base):
    __tablename__ = "appointment_requests"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.patient_profiles.id"))
    symptom_category: Mapped[str] = mapped_column(String(100))
    free_text: Mapped[str] = mapped_column(String(2000))
    facts: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    recommendation: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assigned_staff_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_doctor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    preferred_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    insurance_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    insurance_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Best-effort AI read of the free text, captured at creation (before any structured
    # answers exist). Used only to pre-fill a suggested default on follow-up questions —
    # never written into `facts` directly, since rule-engine inputs must stay explicit
    # patient-confirmed answers, never raw AI inference.
    ai_preview: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class QuestionResponse(Base):
    __tablename__ = "question_responses"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.appointment_requests.id"), index=True
    )
    question_key: Mapped[str] = mapped_column(String(100))
    question_text: Mapped[str] = mapped_column(String(500))
    reason_for_asking: Mapped[str] = mapped_column(String(500))
    answer_value: Mapped[dict] = mapped_column(JSON)
    asked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StaffReview(Base):
    __tablename__ = "staff_reviews"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.appointment_requests.id"), index=True
    )
    reviewer_id: Mapped[str] = mapped_column(String(100))
    decision: Mapped[str] = mapped_column(String(50))
    original_priority: Mapped[str] = mapped_column(String(50))
    final_priority: Mapped[str] = mapped_column(String(50))
    override_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
