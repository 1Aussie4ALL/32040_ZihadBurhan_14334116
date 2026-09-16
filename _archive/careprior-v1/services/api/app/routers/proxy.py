import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from careprior_shared.auth_dep import require_roles

router = APIRouter(prefix="/api/v1", tags=["proxy"])

AUDIT_SERVICE_URL = os.environ.get("AUDIT_SERVICE_URL", "http://audit-service:8000")
NOTIFICATION_SERVICE_URL = os.environ.get("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
RULE_ENGINE_URL = os.environ.get("RULE_ENGINE_URL", "http://rule-engine:8000")


def _forward_auth_header(request: Request) -> dict:
    auth = request.headers.get("authorization")
    return {"Authorization": auth} if auth else {}


@router.get("/audit/events")
async def list_audit_events(
    request: Request,
    target_type: str | None = None,
    target_id: str | None = None,
    _user=Depends(require_roles("manager", "admin", "nurse")),
) -> list:
    params = {k: v for k, v in {"target_type": target_type, "target_id": target_id}.items() if v}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{AUDIT_SERVICE_URL}/audit/events", params=params, headers=_forward_auth_header(request)
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


@router.get("/appointment-requests/{request_id}/audit")
async def request_audit_trail(
    request_id: str,
    request: Request,
    _user=Depends(require_roles("manager", "admin", "nurse", "reception")),
) -> list:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{AUDIT_SERVICE_URL}/appointment-requests/{request_id}/audit",
            headers=_forward_auth_header(request),
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


@router.get("/staff/notifications")
async def list_notifications(
    request: Request,
    _user=Depends(require_roles("reception", "nurse", "manager", "admin")),
) -> list:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{NOTIFICATION_SERVICE_URL}/notifications", headers=_forward_auth_header(request)
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


@router.post("/staff/notifications/{notification_id}/acknowledge")
async def acknowledge_notification(
    notification_id: str,
    request: Request,
    _user=Depends(require_roles("reception", "nurse", "manager", "admin")),
) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{NOTIFICATION_SERVICE_URL}/notifications/{notification_id}/acknowledge",
            headers=_forward_auth_header(request),
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()


@router.get("/rules")
async def list_rules(
    request: Request,
    _user=Depends(require_roles("manager", "admin", "nurse")),
) -> list:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{RULE_ENGINE_URL}/rules", headers=_forward_auth_header(request))
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()
