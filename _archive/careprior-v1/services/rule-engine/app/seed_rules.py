from sqlalchemy.orm import Session

from .models import SafetyRule

# Prototype rule set for synthetic academic evaluation only. NOT clinically validated.
# Facts are structured patient answers captured during adaptive questioning (brief Module 2/4).
RULE_DEFINITIONS = [
    {
        "rule_key": "RULE-CARDIAC-001",
        "name": "Chest pressure with radiating/associated warning signs",
        "description": (
            "Patient reports chest discomfort together with sweating or pain radiating "
            "towards the arm — the brief's case-study warning cluster."
        ),
        "category": "cardiac-warning-cluster",
        "severity": "critical",
        "priority_category": "Immediate Human Review",
        "conditions": {
            "op": "AND",
            "conditions": [
                {"field": "chest_discomfort", "op": "eq", "value": True},
                {
                    "op": "OR",
                    "conditions": [
                        {"field": "sweating", "op": "eq", "value": True},
                        {"field": "arm_radiation", "op": "eq", "value": True},
                    ],
                },
            ],
        },
        "explanation_template": (
            "Chest discomfort combined with {matched} is a prototype warning cluster requiring "
            "immediate human review. Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Route to Immediate Human Review and alert on-duty clinical reviewer.",
    },
    {
        "rule_key": "RULE-FAINT-001",
        "name": "Fainting or loss of consciousness reported",
        "description": "Patient reports fainting.",
        "category": "consciousness-warning",
        "severity": "critical",
        "priority_category": "Immediate Human Review",
        "conditions": {"op": "AND", "conditions": [{"field": "fainting", "op": "eq", "value": True}]},
        "explanation_template": (
            "Reported fainting ({matched}) triggers a prototype immediate-review rule. "
            "Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Route to Immediate Human Review and alert on-duty clinical reviewer.",
    },
    {
        "rule_key": "RULE-CONFUSION-001",
        "name": "New confusion reported alongside breathing difficulty",
        "description": "Patient reports confusion, a prototype warning indicator.",
        "category": "neurological-warning",
        "severity": "high",
        "priority_category": "Immediate Human Review",
        "conditions": {"op": "AND", "conditions": [{"field": "confusion", "op": "eq", "value": True}]},
        "explanation_template": (
            "Reported confusion ({matched}) triggers a prototype immediate-review rule. "
            "Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Route to Immediate Human Review and alert on-duty clinical reviewer.",
    },
    {
        "rule_key": "RULE-SEVERE-WORSENING-001",
        "name": "Severe and worsening symptoms",
        "description": "Patient reports severe symptoms that are worsening.",
        "category": "severity-trend",
        "severity": "high",
        "priority_category": "Priority Review",
        "conditions": {
            "op": "AND",
            "conditions": [
                {"field": "severity", "op": "eq", "value": "severe"},
                {"field": "worsening", "op": "eq", "value": True},
            ],
        },
        "explanation_template": (
            "Severe and worsening symptoms ({matched}) triggers a prototype priority-review rule. "
            "Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Route to Priority Review.",
    },
    {
        "rule_key": "RULE-MODERATE-WORSENING-001",
        "name": "Moderate and worsening symptoms",
        "description": "Patient reports moderate symptoms that are worsening.",
        "category": "severity-trend",
        "severity": "medium",
        "priority_category": "Priority Review",
        "conditions": {
            "op": "AND",
            "conditions": [
                {"field": "severity", "op": "eq", "value": "moderate"},
                {"field": "worsening", "op": "eq", "value": True},
            ],
        },
        "explanation_template": (
            "Moderate and worsening symptoms ({matched}) triggers a prototype priority-review rule. "
            "Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Route to Priority Review.",
    },
    {
        "rule_key": "RULE-DURATION-EXTENDED-001",
        "name": "Extended duration with non-mild severity",
        "description": "Symptoms have persisted 48 hours or more and are not mild.",
        "category": "duration",
        "severity": "medium",
        "priority_category": "Priority Review",
        "conditions": {
            "op": "AND",
            "conditions": [
                {"field": "duration_hours", "op": "gte", "value": 48},
                {"field": "severity", "op": "neq", "value": "mild"},
            ],
        },
        "explanation_template": (
            "Symptoms persisting {matched} at non-mild severity triggers a prototype priority-review rule. "
            "Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Route to Priority Review.",
    },
    {
        "rule_key": "RULE-CONTRADICTION-001",
        "name": "Contradictory patient answers detected",
        "description": "Adaptive questioning detected contradictory answers.",
        "category": "data-quality",
        "severity": "medium",
        "priority_category": "Manual Review Required",
        "conditions": {
            "op": "AND",
            "conditions": [{"field": "contradiction_detected", "op": "eq", "value": True}],
        },
        "explanation_template": (
            "Contradictory answers ({matched}) require manual review before prioritisation. "
            "Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Route to Manual Review Required; staff must clarify with patient.",
    },
    {
        "rule_key": "RULE-MISSING-CORE-001",
        "name": "Core information missing",
        "description": "Duration, severity and onset are all missing.",
        "category": "data-quality",
        "severity": "low",
        "priority_category": "Insufficient Information",
        "conditions": {
            "op": "AND",
            "conditions": [
                {"field": "missing_duration", "op": "eq", "value": True},
                {"field": "missing_severity", "op": "eq", "value": True},
                {"field": "missing_onset", "op": "eq", "value": True},
            ],
        },
        "explanation_template": (
            "Duration, severity and onset are all missing ({matched}); insufficient information "
            "to prioritise safely. Prototype rule for academic evaluation. Not clinically validated."
        ),
        "required_action": "Request additional information from patient before prioritisation.",
    },
]


def seed_rules(db: Session) -> None:
    existing_keys = {r.rule_key for r in db.query(SafetyRule.rule_key).all()}
    for definition in RULE_DEFINITIONS:
        if definition["rule_key"] in existing_keys:
            continue
        db.add(SafetyRule(**definition))
    db.commit()
