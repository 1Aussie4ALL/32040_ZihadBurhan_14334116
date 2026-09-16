import os
from datetime import datetime, timezone
from typing import Any

import httpx

AUDIT_SERVICE_URL = os.environ.get("AUDIT_SERVICE_URL", "http://audit-service:8000")


async def record_audit_event(
    *,
    event_type: str,
    actor_id: str | None,
    actor_role: str | None,
    target_type: str,
    target_id: str,
    action: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Best-effort append-only audit write. Never raises into the caller's request path;
    a failed audit write is logged, not silently discarded, but must not block clinical workflow."""
    payload = {
        "event_type": event_type,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "target_type": target_type,
        "target_id": target_id,
        "action": action,
        "details": details or {},
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(f"{AUDIT_SERVICE_URL}/internal/audit-events", json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        import logging

        logging.getLogger("careprior.audit_client").error(
            "audit_write_failed", extra={"target_type": target_type, "target_id": target_id, "error": str(exc)}
        )
