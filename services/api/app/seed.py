from sqlalchemy.orm import Session

from .models import User
from .security import hash_password

DEV_PASSWORD = "CarePriorDev!23"

DEMO_USERS = [
    {"email": "patient@careprior.local", "full_name": "Pat Patient (Synthetic)", "role": "patient"},
    {"email": "reception@careprior.local", "full_name": "Rae Reception", "role": "reception"},
    {"email": "clinician@careprior.local", "full_name": "Nadia Nurse", "role": "nurse"},
    {"email": "manager@careprior.local", "full_name": "Morgan Manager", "role": "manager"},
    {"email": "admin@careprior.local", "full_name": "Alex Admin", "role": "admin"},
    {"email": "researcher@careprior.local", "full_name": "Riley Researcher", "role": "researcher"},
]


def seed_demo_users(db: Session) -> None:
    existing_emails = {u.email for u in db.query(User.email).all()}
    for demo in DEMO_USERS:
        if demo["email"] in existing_emails:
            continue
        db.add(
            User(
                email=demo["email"],
                password_hash=hash_password(DEV_PASSWORD),
                full_name=demo["full_name"],
                role=demo["role"],
            )
        )
    db.commit()
