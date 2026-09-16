from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from careprior_shared.audit_client import record_audit_event
from careprior_shared.auth_dep import get_current_user, require_roles

from ..db import get_db
from ..models import ConsentRecord, PatientProfile
from ..schemas import ConsentIn, ConsentOut

router = APIRouter(prefix="/api/v1", tags=["patients"])


def get_or_create_patient_profile(db: Session, user_id: str) -> PatientProfile:
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == user_id).first()
    if profile is None:
        profile = PatientProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/patients/me")
def get_my_profile(user=Depends(require_roles("patient")), db: Session = Depends(get_db)) -> dict:
    profile = get_or_create_patient_profile(db, user.user_id)
    return {"patient_id": str(profile.id), "user_id": str(profile.user_id)}


@router.post("/patients/me/consents", response_model=ConsentOut, status_code=201)
async def grant_consent(
    payload: ConsentIn, user=Depends(require_roles("patient")), db: Session = Depends(get_db)
) -> ConsentOut:
    profile = get_or_create_patient_profile(db, user.user_id)
    record = ConsentRecord(patient_id=profile.id, consent_type=payload.consent_type, granted=payload.granted)
    db.add(record)
    db.commit()
    db.refresh(record)
    await record_audit_event(
        event_type="consent.recorded",
        actor_id=user.user_id,
        actor_role=user.role,
        target_type="patient",
        target_id=str(profile.id),
        action=f"Consent '{payload.consent_type}' recorded as granted={payload.granted}",
    )
    return ConsentOut(
        id=str(record.id), consent_type=record.consent_type, granted=record.granted, granted_at=record.granted_at
    )


@router.get("/patients/me/consents", response_model=list[ConsentOut])
def list_my_consents(user=Depends(require_roles("patient")), db: Session = Depends(get_db)) -> list[ConsentOut]:
    profile = get_or_create_patient_profile(db, user.user_id)
    rows = db.query(ConsentRecord).filter(ConsentRecord.patient_id == profile.id).all()
    return [
        ConsentOut(id=str(r.id), consent_type=r.consent_type, granted=r.granted, granted_at=r.granted_at)
        for r in rows
    ]
