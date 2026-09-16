from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from careprior_shared.auth_dep import get_current_user
from careprior_shared.jwt_utils import TokenError, create_access_token, create_refresh_token, decode_token

from ..db import get_db
from ..models import User
from ..schemas import LoginRequest, MeResponse, RefreshRequest, TokenResponse
from ..security import verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role),
        refresh_token=create_refresh_token(str(user.id), user.role),
        role=user.role,
        user_id=str(user.id),
        full_name=user.full_name,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        decoded = decode_token(payload.refresh_token)
    except TokenError as exc:
        raise HTTPException(status_code=401, detail=f"Refresh token {exc}") from exc
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")
    user = db.query(User).filter(User.id == decoded["sub"]).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role),
        refresh_token=create_refresh_token(str(user.id), user.role),
        role=user.role,
        user_id=str(user.id),
        full_name=user.full_name,
    )


@router.post("/logout")
def logout() -> dict:
    # Stateless JWTs in this prototype: logout is enforced client-side by discarding
    # tokens. Server-side revocation/blacklisting is a documented hardening-phase item.
    return {"status": "logged_out"}


@router.get("/me", response_model=MeResponse)
def me(user=Depends(get_current_user), db: Session = Depends(get_db)) -> MeResponse:
    record = db.query(User).filter(User.id == user.user_id).first()
    if record is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return MeResponse(user_id=str(record.id), email=record.email, full_name=record.full_name, role=record.role)
