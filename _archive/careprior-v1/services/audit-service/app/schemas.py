from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditEventIn(BaseModel):
    event_type: str
    actor_id: str | None = None
    actor_role: str | None = None
    target_type: str
    target_id: str
    action: str
    details: dict[str, Any] = {}
    occurred_at: datetime


class AuditEventOut(AuditEventIn):
    id: str
    recorded_at: datetime
