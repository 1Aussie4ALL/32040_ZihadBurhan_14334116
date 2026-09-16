import os
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from careprior_shared.audit_client import record_audit_event
from careprior_shared.auth_dep import require_roles

from ..db import get_db
from ..mock_scheduling import (
    DOCTORS,
    generate_time_slots,
    suggest_doctors,
    suggest_time_slot,
    time_suggestion_reason,
)
from ..models import AppointmentRequest, ConsentRecord, QuestionResponse
from ..question_library import (
    QUESTIONS_BY_KEY,
    coerce_answer,
    compute_missing_flags,
    next_applicable_question,
    suggested_value,
)
from ..routers.patients import get_or_create_patient_profile
from ..schemas import (
    AppointmentRequestCreate,
    AppointmentRequestOut,
    AvailabilityOut,
    BookingUpdateIn,
    DoctorOut,
    DoctorSuggestionsOut,
    NextQuestionOut,
    QuestionHistoryItem,
    QuestionResponseIn,
    TimeSlotOut,
    TimeSuggestionOut,
)

router = APIRouter(prefix="/api/v1/appointment-requests", tags=["appointment-requests"])

AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://ai-service:8000")
PRIORITISATION_SERVICE_URL = os.environ.get("PRIORITISATION_SERVICE_URL", "http://prioritisation-service:8000")
NOTIFICATION_SERVICE_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")


def _get_owned_request(db: Session, request_id: str, patient_id: uuid.UUID) -> AppointmentRequest:
    req = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Appointment request not found")
    if req.patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorised to access this request")
    return req


def _to_out(req: AppointmentRequest, *, hide_internal: bool) -> AppointmentRequestOut:
    recommendation = req.recommendation
    if recommendation and hide_internal:
        # Patients never see AI confidence, uncertainty internals, or rule names (brief §5).
        recommendation = {
            "recommended_priority": recommendation.get("recommended_priority"),
            "recommended_next_action": recommendation.get("recommended_next_action"),
            "additional_information_required": recommendation.get("additional_information_required"),
            "human_approval_mandatory": True,
        }
    return AppointmentRequestOut(
        id=str(req.id),
        symptom_category=req.symptom_category,
        free_text=req.free_text,
        facts=req.facts,
        status=req.status,
        recommendation=recommendation,
        created_at=req.created_at,
        submitted_at=req.submitted_at,
        preferred_doctor=req.preferred_doctor,
        preferred_time=req.preferred_time,
        insurance_type=req.insurance_type,
        insurance_provider=req.insurance_provider,
    )


async def _preview_recommendation(req: AppointmentRequest) -> dict:
    """Runs the same rule-engine + AI pipeline as final submission, but is read-only —
    it doesn't persist a recommendation, change status, or send notifications. Used to
    drive doctor/time suggestions before the patient finalises their booking. Safe to call
    more than once: both the rule engine and mock AI provider are deterministic."""
    facts = dict(req.facts)
    facts.update(compute_missing_flags(facts))
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{PRIORITISATION_SERVICE_URL}/internal/prioritise",
            json={"request_id": str(req.id), "free_text": req.free_text, "facts": facts},
        )
        response.raise_for_status()
        return response.json()


@router.get("/availability", response_model=AvailabilityOut)
def get_availability(user=Depends(require_roles("patient"))) -> AvailabilityOut:
    return AvailabilityOut(
        doctors=[DoctorOut(**d) for d in DOCTORS],
        time_slots=[TimeSlotOut(**s) for s in generate_time_slots()],
    )


@router.post("", response_model=AppointmentRequestOut, status_code=201)
async def create_request(
    payload: AppointmentRequestCreate,
    user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
) -> AppointmentRequestOut:
    profile = get_or_create_patient_profile(db, user.user_id)
    req = AppointmentRequest(
        patient_id=profile.id,
        symptom_category=payload.symptom_category,
        free_text=payload.free_text,
        facts={},
        status="draft",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{AI_SERVICE_URL}/internal/interpret",
                json={"request_id": str(req.id), "free_text": payload.free_text, "structured_answers": {}},
            )
            response.raise_for_status()
            req.ai_preview = response.json()
            db.commit()
    except httpx.HTTPError:
        pass  # Question pre-fill is a convenience only; the flow works identically without it.

    await record_audit_event(
        event_type="appointment_request.created",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="appointment_request",
        target_id=str(req.id),
        action=f"Request created with symptom category '{payload.symptom_category}'",
    )
    return _to_out(req, hide_internal=True)


@router.get("/{request_id}", response_model=AppointmentRequestOut)
def get_request(request_id: str, user=Depends(require_roles("patient")), db: Session = Depends(get_db)):
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    return _to_out(req, hide_internal=True)


@router.get("/{request_id}/next-question", response_model=NextQuestionOut)
def get_next_question(request_id: str, user=Depends(require_roles("patient")), db: Session = Depends(get_db)):
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    if req.status != "draft":
        raise HTTPException(status_code=400, detail="Request already submitted; cannot ask further questions")
    answered_keys = {
        r.question_key for r in db.query(QuestionResponse).filter(QuestionResponse.request_id == req.id).all()
    }
    question = next_applicable_question(req.facts, answered_keys)
    if question is None:
        return NextQuestionOut(done=True, questions_answered=len(answered_keys), max_questions=9)
    db.add(
        QuestionResponse(
            request_id=req.id,
            question_key=question["key"],
            question_text=question["text"],
            reason_for_asking=question["reason"],
            answer_value={},
        )
    )
    db.commit()
    suggestion = suggested_value(question, req.ai_preview)
    return NextQuestionOut(
        done=False,
        question_key=question["key"],
        question_text=question["text"],
        input_type=question["input_type"],
        options=question.get("options"),
        reason=question["reason"],
        questions_answered=len(answered_keys),
        max_questions=9,
        suggested_value=suggestion[0] if suggestion else None,
        suggested_reason=suggestion[1] if suggestion else None,
    )


@router.post("/{request_id}/responses", status_code=201)
async def submit_response(
    request_id: str,
    payload: QuestionResponseIn,
    user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    if req.status != "draft":
        raise HTTPException(status_code=400, detail="Request already submitted; cannot modify answers")
    if payload.question_key not in QUESTIONS_BY_KEY:
        raise HTTPException(status_code=400, detail="Unknown question key")

    question = QUESTIONS_BY_KEY[payload.question_key]
    coerced = coerce_answer(question, payload.answer_value)

    pending = (
        db.query(QuestionResponse)
        .filter(QuestionResponse.request_id == req.id, QuestionResponse.question_key == payload.question_key)
        .order_by(QuestionResponse.asked_at.desc())
        .first()
    )
    if pending is None:
        raise HTTPException(status_code=400, detail="Question was not asked for this request")
    pending.answer_value = {"value": coerced}
    pending.answered_at = datetime.now(timezone.utc)

    facts = dict(req.facts)
    facts[payload.question_key] = coerced
    req.facts = facts
    db.commit()
    return {"status": "recorded", "question_key": payload.question_key}


@router.get("/{request_id}/question-history", response_model=list[QuestionHistoryItem])
def question_history(request_id: str, user=Depends(require_roles("patient")), db: Session = Depends(get_db)):
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    rows = (
        db.query(QuestionResponse)
        .filter(QuestionResponse.request_id == req.id)
        .order_by(QuestionResponse.asked_at.asc())
        .all()
    )
    return [
        QuestionHistoryItem(
            question_key=r.question_key,
            question_text=r.question_text,
            reason_for_asking=r.reason_for_asking,
            answer_value=r.answer_value.get("value") if r.answer_value else None,
            asked_at=r.asked_at,
            answered_at=r.answered_at,
        )
        for r in rows
    ]


@router.get("/{request_id}/doctor-suggestions", response_model=DoctorSuggestionsOut)
def get_doctor_suggestions(request_id: str, user=Depends(require_roles("patient")), db: Session = Depends(get_db)):
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    suggested = suggest_doctors(req.symptom_category, req.facts)
    return DoctorSuggestionsOut(
        suggested=[DoctorOut(**d) for d in suggested],
        reason="These doctors are best suited for your described symptoms.",
    )


@router.get("/{request_id}/time-suggestion", response_model=TimeSuggestionOut)
async def get_time_suggestion(request_id: str, user=Depends(require_roles("patient")), db: Session = Depends(get_db)):
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    try:
        recommendation = await _preview_recommendation(req)
        priority = recommendation["recommended_priority"]
    except httpx.HTTPError:
        priority = None  # Fail open to a neutral, non-urgent suggestion if the pipeline is unavailable.
    slots = generate_time_slots()
    suggested = suggest_time_slot(priority, slots)
    return TimeSuggestionOut(
        suggested=TimeSlotOut(**suggested) if suggested else None,
        reason=time_suggestion_reason(priority),
    )


@router.patch("/{request_id}/booking", response_model=AppointmentRequestOut)
def update_booking(
    request_id: str,
    payload: BookingUpdateIn,
    user=Depends(require_roles("patient")),
    db: Session = Depends(get_db),
) -> AppointmentRequestOut:
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    if req.status != "draft":
        raise HTTPException(status_code=400, detail="Request already submitted; cannot change booking details")
    if payload.preferred_doctor is not None:
        req.preferred_doctor = payload.preferred_doctor
    if payload.preferred_time is not None:
        req.preferred_time = payload.preferred_time
    if payload.insurance_type is not None:
        req.insurance_type = payload.insurance_type
    if payload.insurance_provider is not None:
        req.insurance_provider = payload.insurance_provider
    db.commit()
    db.refresh(req)
    return _to_out(req, hide_internal=True)


@router.post("/{request_id}/submit", response_model=AppointmentRequestOut)
async def submit_request(request_id: str, user=Depends(require_roles("patient")), db: Session = Depends(get_db)):
    profile = get_or_create_patient_profile(db, user.user_id)
    req = _get_owned_request(db, request_id, profile.id)
    if req.status != "draft":
        raise HTTPException(status_code=400, detail="Request has already been submitted")

    consent = (
        db.query(ConsentRecord)
        .filter(ConsentRecord.patient_id == profile.id, ConsentRecord.granted.is_(True))
        .first()
    )
    if consent is None:
        raise HTTPException(status_code=400, detail="Consent must be granted before submitting a request")

    try:
        recommendation = await _preview_recommendation(req)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Prioritisation pipeline unavailable: {exc}") from exc

    facts = dict(req.facts)
    facts.update(compute_missing_flags(facts))
    req.facts = facts
    req.recommendation = recommendation
    req.status = "submitted"
    req.submitted_at = datetime.now(timezone.utc)
    db.commit()

    await record_audit_event(
        event_type="prioritisation.generated",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="appointment_request",
        target_id=str(req.id),
        action=f"Recommended priority: {recommendation['recommended_priority']} (uncertainty: {recommendation['uncertainty_level']})",
        details={
            "recommended_priority": recommendation["recommended_priority"],
            "triggered_rule_ids": [t["rule_id"] for t in recommendation["triggered_rules"]],
            "uncertainty_level": recommendation["uncertainty_level"],
            "system_version": recommendation["system_version"],
        },
    )
    await record_audit_event(
        event_type="appointment_request.submitted",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="appointment_request",
        target_id=str(req.id),
        action="Patient submitted appointment request",
    )

    if recommendation.get("requires_immediate_acknowledgement"):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{NOTIFICATION_SERVICE_URL}/internal/notifications",
                    json={
                        "recipient_role": "nurse",
                        "request_id": str(req.id),
                        "category": "immediate_review",
                        "message": "A new request requires immediate human review.",
                    },
                )
        except httpx.HTTPError:
            pass  # Notification is best-effort; the queue itself still surfaces the case.

    return _to_out(req, hide_internal=True)
