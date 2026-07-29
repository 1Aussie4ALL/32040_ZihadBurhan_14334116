import sys
from datetime import datetime, timezone

sys.path.insert(0, "/app/shared")

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from careprior_shared.auth_dep import require_roles
from careprior_shared.logging_config import configure_logging

from .db import get_db, init_db
from .models import Notification

configure_logging("notification-service")

app = FastAPI(title="CarePrior Notification Service", version="0.1.0")
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
    return {"status": "ok", "service": "notification-service"}


class NotificationIn(BaseModel):
    recipient_role: str
    request_id: str
    category: str
    message: str


class NotificationOut(BaseModel):
    id: str
    recipient_role: str
    request_id: str
    category: str
    message: str
    acknowledged: bool
    acknowledged_by: str | None
    created_at: datetime


@app.post("/internal/notifications", status_code=201)
def create_notification(payload: NotificationIn, db: Session = Depends(get_db)) -> dict:
    row = Notification(
        recipient_role=payload.recipient_role,
        request_id=payload.request_id,
        category=payload.category,
        message=payload.message,
    )
    db.add(row)
    db.commit()
    return {"id": str(row.id)}


@app.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    user=Depends(require_roles("reception", "nurse", "manager", "admin")),
) -> list[NotificationOut]:
    rows = (
        db.query(Notification)
        .filter(Notification.recipient_role == user.role)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [
        NotificationOut(
            id=str(r.id),
            recipient_role=r.recipient_role,
            request_id=r.request_id,
            category=r.category,
            message=r.message,
            acknowledged=r.acknowledged,
            acknowledged_by=r.acknowledged_by,
            created_at=r.created_at,
        )
        for r in rows
    ]


@app.post("/notifications/{notification_id}/acknowledge")
def acknowledge_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    user=Depends(require_roles("reception", "nurse", "manager", "admin")),
) -> dict:
    row = db.query(Notification).filter(Notification.id == notification_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.acknowledged = True
    row.acknowledged_by = user.user_id
    row.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "acknowledged"}
