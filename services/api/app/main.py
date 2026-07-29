import sys

sys.path.insert(0, "/app/shared")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from careprior_shared.logging_config import configure_logging

from .db import SessionLocal, init_db
from .routers import auth, patients, proxy, requests, staff
from .seed import seed_demo_users

configure_logging("api")

app = FastAPI(title="CarePrior API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(requests.router)
app.include_router(staff.router)
app.include_router(proxy.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed_demo_users(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "api"}
