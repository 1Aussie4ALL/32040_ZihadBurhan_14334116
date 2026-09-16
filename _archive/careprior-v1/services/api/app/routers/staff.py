from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from careprior_shared.audit_client import record_audit_event
from careprior_shared.auth_dep import require_roles

from ..db import get_db
from ..models import AppointmentRequest, PatientProfile, QuestionResponse, StaffReview, User
from ..schemas import QueueItem, ReviewDecisionIn, StaffReviewOut

router = APIRouter(prefix="/api/v1/staff", tags=["staff"])


@router.get("/review-queue", response_model=list[QueueItem])
def review_queue(
    priority: str | None = None,
    status: str | None = None,
    user=Depends(require_roles("reception", "nurse", "manager")),
    db: Session = Depends(get_db),
) -> list[QueueItem]:
    q = db.query(AppointmentRequest).filter(AppointmentRequest.status != "draft")
    if status:
        q = q.filter(AppointmentRequest.status == status)
    rows = q.order_by(AppointmentRequest.submitted_at.asc()).all()
    items = []
    for r in rows:
        rec = r.recommendation or {}
        recommended_priority = rec.get("recommended_priority")
        if priority and recommended_priority != priority:
            continue
        patient_profile = db.query(PatientProfile).filter(PatientProfile.id == r.patient_id).first()
        patient_user = (
            db.query(User).filter(User.id == patient_profile.user_id).first() if patient_profile else None
        )
        items.append(
            QueueItem(
                id=str(r.id),
                symptom_category=r.symptom_category,
                recommended_priority=recommended_priority,
                uncertainty_level=rec.get("uncertainty_level"),
                status=r.status,
                created_at=r.created_at,
                submitted_at=r.submitted_at,
                assigned_staff_id=r.assigned_staff_id,
                preferred_doctor=r.preferred_doctor,
                preferred_time=r.preferred_time,
                patient_name=patient_user.full_name if patient_user else None,
            )
        )
    # Immediate Human Review first, then Priority Review, oldest first within each bucket.
    order = {
        "Immediate Human Review": 0,
        "Priority Review": 1,
        "Manual Review Required": 2,
        "Insufficient Information": 3,
        "Routine Review": 4,
    }
    items.sort(key=lambda i: order.get(i.recommended_priority or "", 5))
    return items


@router.get("/requests/{request_id}")
def get_request_detail(
    request_id: str,
    user=Depends(require_roles("reception", "nurse", "manager")),
    db: Session = Depends(get_db),
) -> dict:
    req = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Appointment request not found")
    history = (
        db.query(QuestionResponse)
        .filter(QuestionResponse.request_id == req.id)
        .order_by(QuestionResponse.asked_at.asc())
        .all()
    )
    reviews = (
        db.query(StaffReview).filter(StaffReview.request_id == req.id).order_by(StaffReview.created_at.asc()).all()
    )
    patient_profile = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
    patient_user = db.query(User).filter(User.id == patient_profile.user_id).first() if patient_profile else None
    return {
        "id": str(req.id),
        "symptom_category": req.symptom_category,
        "free_text": req.free_text,
        "facts": req.facts,
        "status": req.status,
        "recommendation": req.recommendation,
        "preferred_doctor": req.preferred_doctor,
        "preferred_time": req.preferred_time.isoformat() if req.preferred_time else None,
        "insurance_type": req.insurance_type,
        "insurance_provider": req.insurance_provider,
        "patient_name": patient_user.full_name if patient_user else None,
        "patient_email": patient_user.email if patient_user else None,
        "patient_phone": patient_profile.phone if patient_profile else None,
        "created_at": req.created_at.isoformat(),
        "submitted_at": req.submitted_at.isoformat() if req.submitted_at else None,
        "review_locked": req.review_locked,
        "question_history": [
            {
                "question_key": h.question_key,
                "question_text": h.question_text,
                "reason_for_asking": h.reason_for_asking,
                "answer_value": h.answer_value.get("value") if h.answer_value else None,
                "asked_at": h.asked_at.isoformat(),
                "answered_at": h.answered_at.isoformat() if h.answered_at else None,
            }
            for h in history
        ],
        "reviews": [
            {
                "id": str(rv.id),
                "reviewer_id": rv.reviewer_id,
                "decision": rv.decision,
                "original_priority": rv.original_priority,
                "final_priority": rv.final_priority,
                "override_reason": rv.override_reason,
                "notes": rv.notes,
                "created_at": rv.created_at.isoformat(),
            }
            for rv in reviews
        ],
    }


def _create_review(
    db: Session,
    req: AppointmentRequest,
    reviewer_id: str,
    decision: str,
    final_priority: str,
    override_reason: str | None,
    notes: str | None,
) -> StaffReview:
    original_priority = (req.recommendation or {}).get("recommended_priority", "Unknown")
    review = StaffReview(
        request_id=req.id,
        reviewer_id=reviewer_id,
        decision=decision,
        original_priority=original_priority,
        final_priority=final_priority,
        override_reason=override_reason,
        notes=notes,
    )
    db.add(review)
    return review


@router.post("/requests/{request_id}/accept", response_model=StaffReviewOut)
async def accept_recommendation(
    request_id: str,
    payload: ReviewDecisionIn,
    user=Depends(require_roles("nurse")),
    db: Session = Depends(get_db),
) -> StaffReviewOut:
    req = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Appointment request not found")
    if req.review_locked:
        raise HTTPException(status_code=400, detail="This review is already locked")
    final_priority = (req.recommendation or {}).get("recommended_priority", "Unknown")
    review = _create_review(db, req, user.user_id, "accept", final_priority, None, payload.notes)
    req.status = "reviewed"
    req.review_locked = True
    db.commit()
    db.refresh(review)
    await record_audit_event(
        event_type="staff_review.accepted",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="appointment_request",
        target_id=str(req.id),
        action=f"Reviewer accepted recommended priority '{final_priority}'",
    )
    return StaffReviewOut(
        id=str(review.id),
        request_id=str(req.id),
        reviewer_id=review.reviewer_id,
        decision=review.decision,
        original_priority=review.original_priority,
        final_priority=review.final_priority,
        override_reason=review.override_reason,
        notes=review.notes,
        created_at=review.created_at,
    )


@router.post("/requests/{request_id}/override", response_model=StaffReviewOut)
async def override_recommendation(
    request_id: str,
    payload: ReviewDecisionIn,
    user=Depends(require_roles("nurse")),
    db: Session = Depends(get_db),
) -> StaffReviewOut:
    if not payload.override_reason or not payload.override_reason.strip():
        raise HTTPException(status_code=400, detail="An override reason is mandatory")
    if not payload.final_priority:
        raise HTTPException(status_code=400, detail="final_priority is required for an override")

    req = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Appointment request not found")
    if req.review_locked:
        raise HTTPException(status_code=400, detail="This review is already locked")

    original_priority = (req.recommendation or {}).get("recommended_priority", "Unknown")
    review = _create_review(
        db, req, user.user_id, "override", payload.final_priority, payload.override_reason, payload.notes
    )
    req.status = "reviewed"
    req.review_locked = True
    db.commit()
    db.refresh(review)
    await record_audit_event(
        event_type="staff_review.overridden",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="appointment_request",
        target_id=str(req.id),
        action=f"Reviewer overrode '{original_priority}' to '{payload.final_priority}': {payload.override_reason}",
        details={"original_priority": original_priority, "final_priority": payload.final_priority},
    )
    return StaffReviewOut(
        id=str(review.id),
        request_id=str(req.id),
        reviewer_id=review.reviewer_id,
        decision=review.decision,
        original_priority=review.original_priority,
        final_priority=review.final_priority,
        override_reason=review.override_reason,
        notes=review.notes,
        created_at=review.created_at,
    )


@router.post("/requests/{request_id}/escalate", response_model=StaffReviewOut)
async def escalate_request(
    request_id: str,
    payload: ReviewDecisionIn,
    user=Depends(require_roles("reception", "nurse")),
    db: Session = Depends(get_db),
) -> StaffReviewOut:
    req = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Appointment request not found")
    final_priority = (req.recommendation or {}).get("recommended_priority", "Unknown")
    review = _create_review(db, req, user.user_id, "escalate", final_priority, None, payload.notes)
    req.status = "escalated"
    db.commit()
    db.refresh(review)
    await record_audit_event(
        event_type="request.escalated",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="appointment_request",
        target_id=str(req.id),
        action="Request escalated to clinical reviewer",
    )
    return StaffReviewOut(
        id=str(review.id),
        request_id=str(req.id),
        reviewer_id=review.reviewer_id,
        decision=review.decision,
        original_priority=review.original_priority,
        final_priority=review.final_priority,
        override_reason=review.override_reason,
        notes=review.notes,
        created_at=review.created_at,
    )


@router.post("/requests/{request_id}/request-information", response_model=StaffReviewOut)
async def request_additional_information(
    request_id: str,
    payload: ReviewDecisionIn,
    user=Depends(require_roles("reception", "nurse")),
    db: Session = Depends(get_db),
) -> StaffReviewOut:
    req = db.query(AppointmentRequest).filter(AppointmentRequest.id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Appointment request not found")
    final_priority = (req.recommendation or {}).get("recommended_priority", "Unknown")
    review = _create_review(db, req, user.user_id, "request_information", final_priority, None, payload.notes)
    req.status = "awaiting_information"
    db.commit()
    db.refresh(review)
    await record_audit_event(
        event_type="request.additional_information_requested",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="appointment_request",
        target_id=str(req.id),
        action="Staff requested additional information from patient",
    )
    return StaffReviewOut(
        id=str(review.id),
        request_id=str(req.id),
        reviewer_id=review.reviewer_id,
        decision=review.decision,
        original_priority=review.original_priority,
        final_priority=review.final_priority,
        override_reason=review.override_reason,
        notes=review.notes,
        created_at=review.created_at,
    )
