import sys

sys.path.insert(0, "/app/shared")

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from careprior_shared.auth_dep import require_roles
from careprior_shared.logging_config import configure_logging

from .db import get_db, init_db
from .models import AuditEvent
from .schemas import AuditEventIn, AuditEventOut

configure_logging("audit-service")

app = FastAPI(title="CarePrior Audit Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "audit-service"}


@app.post("/internal/audit-events", status_code=201)
def write_audit_event(event: AuditEventIn, db: Session = Depends(get_db)) -> dict:
    """Called service-to-service only (internal docker network). Insert-only."""
    row = AuditEvent(
        event_type=event.event_type,
        actor_id=event.actor_id,
        actor_role=event.actor_role,
        target_type=event.target_type,
        target_id=event.target_id,
        action=event.action,
        details=event.details,
        occurred_at=event.occurred_at,
    )
    db.add(row)
    db.commit()
    return {"id": str(row.id)}


@app.get("/audit/events", response_model=list[AuditEventOut])
def list_audit_events(
    target_type: str | None = Query(default=None),
    target_id: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("manager", "admin", "nurse")),
) -> list[AuditEventOut]:
    q = db.query(AuditEvent)
    if target_type:
        q = q.filter(AuditEvent.target_type == target_type)
    if target_id:
        q = q.filter(AuditEvent.target_id == target_id)
    rows = q.order_by(AuditEvent.occurred_at.asc()).offset(offset).limit(limit).all()
    return [
        AuditEventOut(
            id=str(r.id),
            event_type=r.event_type,
            actor_id=r.actor_id,
            actor_role=r.actor_role,
            target_type=r.target_type,
            target_id=r.target_id,
            action=r.action,
            details=r.details,
            occurred_at=r.occurred_at,
            recorded_at=r.recorded_at,
        )
        for r in rows
    ]


@app.get("/appointment-requests/{request_id}/audit", response_model=list[AuditEventOut])
def request_audit_trail(
    request_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("manager", "admin", "nurse", "reception")),
) -> list[AuditEventOut]:
    rows = (
        db.query(AuditEvent)
        .filter(AuditEvent.target_type == "appointment_request", AuditEvent.target_id == request_id)
        .order_by(AuditEvent.occurred_at.asc())
        .all()
    )
    return [
        AuditEventOut(
            id=str(r.id),
            event_type=r.event_type,
            actor_id=r.actor_id,
            actor_role=r.actor_role,
            target_type=r.target_type,
            target_id=r.target_id,
            action=r.action,
            details=r.details,
            occurred_at=r.occurred_at,
            recorded_at=r.recorded_at,
        )
        for r in rows
    ]
