import sys

sys.path.insert(0, "/app/shared")

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from careprior_shared.auth_dep import require_roles
from careprior_shared.logging_config import configure_logging

from .db import get_db, init_db
from .evaluator import evaluate_condition
from .models import SafetyRule
from .seed_rules import seed_rules

configure_logging("rule-engine")

app = FastAPI(title="CarePrior Rule Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    from .db import SessionLocal

    db = SessionLocal()
    try:
        seed_rules(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "rule-engine"}


class EvaluateRulesRequest(BaseModel):
    request_id: str
    facts: dict


class RuleTriggerResponse(BaseModel):
    rule_id: str
    rule_key: str
    rule_name: str
    severity: str
    priority_category: str
    explanation: str
    matched_answer: str
    source_note: str


@app.post("/internal/evaluate-rules", response_model=list[RuleTriggerResponse])
def evaluate_rules(payload: EvaluateRulesRequest, db: Session = Depends(get_db)) -> list[RuleTriggerResponse]:
    active_rules = db.query(SafetyRule).filter(SafetyRule.active.is_(True)).all()
    triggered: list[RuleTriggerResponse] = []
    for rule in active_rules:
        matched, contributing = evaluate_condition(rule.conditions, payload.facts)
        if not matched:
            continue
        matched_summary = "; ".join(contributing) if contributing else "condition met"
        triggered.append(
            RuleTriggerResponse(
                rule_id=str(rule.id),
                rule_key=rule.rule_key,
                rule_name=rule.name,
                severity=rule.severity,
                priority_category=rule.priority_category,
                explanation=rule.explanation_template.format(matched=matched_summary),
                matched_answer=matched_summary,
                source_note=rule.source_note,
            )
        )
    return triggered


@app.get("/rules")
def list_rules(
    db: Session = Depends(get_db), _user=Depends(require_roles("manager", "admin", "nurse"))
) -> list[dict]:
    rows = db.query(SafetyRule).order_by(SafetyRule.rule_key).all()
    return [
        {
            "id": str(r.id),
            "rule_key": r.rule_key,
            "name": r.name,
            "description": r.description,
            "category": r.category,
            "severity": r.severity,
            "priority_category": r.priority_category,
            "version": r.version,
            "active": r.active,
            "approval_status": r.approval_status,
            "source_note": r.source_note,
            "effective_date": r.effective_date.isoformat(),
        }
        for r in rows
    ]
