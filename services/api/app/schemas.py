from datetime import datetime
from typing import Any

from pydantic import BaseModel


class LoginRequest(BaseModel):
    # Plain str, not EmailStr: strict RFC email validation rejects the .local TLD used
    # by this prototype's seeded demo accounts (.local is a reserved special-use domain).
    # Login security comes from password verification, not email-format strictness.
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


class MeResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str


class ConsentIn(BaseModel):
    consent_type: str = "synthetic_intake_and_ai_processing"
    granted: bool = True


class ConsentOut(BaseModel):
    id: str
    consent_type: str
    granted: bool
    granted_at: datetime


class AppointmentRequestCreate(BaseModel):
    symptom_category: str
    free_text: str


class AppointmentRequestOut(BaseModel):
    id: str
    symptom_category: str
    free_text: str
    facts: dict
    status: str
    recommendation: dict | None
    created_at: datetime
    submitted_at: datetime | None


class NextQuestionOut(BaseModel):
    done: bool
    question_key: str | None = None
    question_text: str | None = None
    input_type: str | None = None
    options: list[str] | None = None
    reason: str | None = None
    questions_answered: int = 0
    max_questions: int = 0


class QuestionResponseIn(BaseModel):
    question_key: str
    answer_value: Any


class QuestionHistoryItem(BaseModel):
    question_key: str
    question_text: str
    reason_for_asking: str
    answer_value: Any
    asked_at: datetime
    answered_at: datetime | None


class ReviewDecisionIn(BaseModel):
    override_reason: str | None = None
    notes: str | None = None
    final_priority: str | None = None


class StaffReviewOut(BaseModel):
    id: str
    request_id: str
    reviewer_id: str
    decision: str
    original_priority: str
    final_priority: str
    override_reason: str | None
    notes: str | None
    created_at: datetime


class QueueItem(BaseModel):
    id: str
    symptom_category: str
    recommended_priority: str | None
    uncertainty_level: str | None
    status: str
    created_at: datetime
    submitted_at: datetime | None
    assigned_staff_id: str | None
