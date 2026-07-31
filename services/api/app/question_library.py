import re
from typing import Any, Callable

QuestionDef = dict[str, Any]

# Fixed adaptive question library (brief Module 2). Each question records why it was
# asked so the reasoning is auditable. `applies_if` gates follow-up branching (e.g. only
# ask about arm radiation if chest discomfort was reported) so patients are never asked
# unnecessary repetitive questions. Max question count is enforced by the router.
MAX_QUESTIONS = 9


def _always(facts: dict[str, Any]) -> bool:
    return True


def _if_chest_discomfort(facts: dict[str, Any]) -> bool:
    return facts.get("chest_discomfort") is True


QUESTION_LIBRARY: list[QuestionDef] = [
    {
        "key": "onset",
        "text": "When did the symptoms start? (sudden / gradual)",
        "input_type": "choice",
        "options": ["sudden", "gradual"],
        "reason": "Onset was not clear from your initial description, and helps staff understand how the situation developed.",
        "applies_if": _always,
    },
    {
        "key": "severity",
        "text": "How would you describe the severity right now?",
        "input_type": "choice",
        "options": ["mild", "moderate", "severe"],
        "reason": "Severity was not stated clearly, so clinic staff have a clearer picture when reviewing your request.",
        "applies_if": _always,
    },
    {
        "key": "worsening",
        "text": "Are your symptoms getting worse?",
        "input_type": "boolean",
        "reason": "Knowing whether symptoms are stable or worsening helps staff judge how quickly your request should be reviewed.",
        "applies_if": _always,
    },
    {
        "key": "duration_hours",
        "text": "Roughly how many hours have you had these symptoms?",
        "input_type": "number",
        "reason": "Duration was not stated in your description.",
        "applies_if": _always,
    },
    {
        "key": "chest_discomfort",
        "text": "Are you experiencing any chest discomfort, tightness or pressure?",
        "input_type": "boolean",
        "reason": "This checks for a recognised prototype warning indicator relevant to your reported symptoms.",
        "applies_if": _always,
    },
    {
        "key": "sweating",
        "text": "Are you sweating more than usual, alongside the chest discomfort?",
        "input_type": "boolean",
        "reason": "Asked because you reported chest discomfort, to check for a prototype warning-indicator cluster.",
        "applies_if": _if_chest_discomfort,
    },
    {
        "key": "arm_radiation",
        "text": "Does the discomfort extend towards your arm, neck or jaw?",
        "input_type": "boolean",
        "reason": "Asked because you reported chest discomfort, to check for a prototype warning-indicator cluster.",
        "applies_if": _if_chest_discomfort,
    },
    {
        "key": "fainting",
        "text": "Have you fainted, or felt like you were about to faint?",
        "input_type": "boolean",
        "reason": "This checks for a recognised prototype warning indicator.",
        "applies_if": _always,
    },
    {
        "key": "confusion",
        "text": "Have you noticed any new confusion or difficulty thinking clearly?",
        "input_type": "boolean",
        "reason": "This checks for a recognised prototype warning indicator.",
        "applies_if": _always,
    },
]

QUESTIONS_BY_KEY = {q["key"]: q for q in QUESTION_LIBRARY}


def next_applicable_question(facts: dict[str, Any], answered_keys: set[str]) -> QuestionDef | None:
    if len(answered_keys) >= MAX_QUESTIONS:
        return None
    for question in QUESTION_LIBRARY:
        if question["key"] in answered_keys:
            continue
        applies_if: Callable[[dict[str, Any]], bool] = question["applies_if"]
        if applies_if(facts):
            return question
    return None


def coerce_answer(question: QuestionDef, raw_value: Any) -> Any:
    if question["input_type"] == "number":
        return float(raw_value)
    if question["input_type"] == "boolean":
        return bool(raw_value)
    return raw_value


def compute_missing_flags(facts: dict[str, Any]) -> dict[str, bool]:
    return {
        "missing_duration": facts.get("duration_hours") is None,
        "missing_severity": facts.get("severity") is None,
        "missing_onset": facts.get("onset") is None,
    }


# Pre-fill threshold for the AI-suggested-answer feature. This only ever pre-selects a
# default on the question UI — it never writes to `facts` on its own. The patient must
# still explicitly confirm (or change) the value via the normal answer-submission path,
# because rule-engine inputs must stay explicit patient-confirmed answers, never raw AI
# inference (see README §7).
SUGGESTION_CONFIDENCE_THRESHOLD = 0.75

_RISK_INDICATOR_QUESTION_KEYS = {"chest_discomfort", "sweating", "arm_radiation", "fainting", "confusion"}

_DURATION_PATTERN = re.compile(r"(\d+)\s*(hour|hours|day|days|week|weeks)")


def _duration_string_to_hours(duration: str) -> float | None:
    match = _DURATION_PATTERN.search(duration)
    if not match:
        return None
    amount = float(match.group(1))
    unit = match.group(2)
    if unit.startswith("day"):
        return amount * 24
    if unit.startswith("week"):
        return amount * 24 * 7
    return amount


def suggested_value(question: QuestionDef, ai_preview: dict[str, Any] | None) -> tuple[Any, str] | None:
    """Returns (value, reason) if the AI's free-text read is confident enough to suggest a
    default for this question, else None. Every question is still asked regardless."""
    if not ai_preview or ai_preview.get("confidence", 0) < SUGGESTION_CONFIDENCE_THRESHOLD:
        return None

    key = question["key"]
    reason = "Based on your description, we think this might be the answer — confirm or change it."

    if key in _RISK_INDICATOR_QUESTION_KEYS:
        if key in (ai_preview.get("possible_risk_indicators") or []):
            return True, reason
        return None

    if key == "severity" and ai_preview.get("severity"):
        return ai_preview["severity"], reason
    if key == "onset" and ai_preview.get("onset"):
        return ai_preview["onset"], reason
    if key == "worsening" and ai_preview.get("worsening") is not None:
        return ai_preview["worsening"], reason
    if key == "duration_hours" and ai_preview.get("duration"):
        hours = _duration_string_to_hours(ai_preview["duration"])
        if hours is not None:
            return hours, reason

    return None
