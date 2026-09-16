import os
from datetime import datetime, timezone
from typing import Any

import httpx

from careprior_shared.schemas import PRECEDENCE_ORDER, PrioritisationRecommendation, RuleTriggerOut

RULE_ENGINE_URL = os.environ.get("RULE_ENGINE_URL", "http://rule-engine:8000")
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://ai-service:8000")
SYSTEM_VERSION = "careprior-prioritisation-v0.1.0"

NEXT_ACTION_BY_CATEGORY = {
    "Immediate Human Review": "Alert on-duty clinical reviewer immediately and require acknowledgement.",
    "Priority Review": "Assign to priority review queue for early clinical reviewer attention.",
    "Manual Review Required": "Route to a staff member for manual clarification before prioritisation.",
    "Insufficient Information": "Request additional information from the patient before prioritisation.",
    "Routine Review": "Assign to routine review queue for standard-timeframe appointment scheduling.",
}


def _rank(category: str) -> int:
    return PRECEDENCE_ORDER.index(category)


async def _fetch_rule_triggers(request_id: str, facts: dict[str, Any]) -> list[dict]:
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            f"{RULE_ENGINE_URL}/internal/evaluate-rules",
            json={"request_id": request_id, "facts": facts},
        )
        response.raise_for_status()
        return response.json()


async def _fetch_ai_interpretation(request_id: str, free_text: str, structured_answers: dict[str, Any]):
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{AI_SERVICE_URL}/internal/interpret",
            json={"request_id": request_id, "free_text": free_text, "structured_answers": structured_answers},
        )
        response.raise_for_status()
        return response.json()


async def generate_recommendation(
    request_id: str, free_text: str, facts: dict[str, Any]
) -> PrioritisationRecommendation:
    """Implements the brief's precedence model: deterministic rule outcomes always
    outrank AI-driven ones. AI failure or low confidence routes to Manual Review
    Required rather than silently degrading to Routine Review."""

    rule_triggers_raw = await _fetch_rule_triggers(request_id, facts)
    triggered_rules = [
        RuleTriggerOut(
            rule_id=t["rule_id"],
            rule_name=t["rule_name"],
            severity=t["severity"],
            category=t["priority_category"],
            explanation=t["explanation"],
            matched_answer=t["matched_answer"],
        )
        for t in rule_triggers_raw
    ]
    rule_category = min((t.category for t in triggered_rules), key=_rank, default=None)

    ai_failed = False
    ai_result: dict[str, Any] | None = None
    try:
        ai_result = await _fetch_ai_interpretation(request_id, free_text, facts)
    except httpx.HTTPError:
        ai_failed = True

    contributing_factors: list[str] = [t.matched_answer for t in triggered_rules]
    missing_information: list[str] = []
    uncertainty_level = "low"

    if ai_failed:
        ai_category = "Manual Review Required"
        uncertainty_level = "high"
        contributing_factors.append("AI interpretation service was unavailable for this request.")
    else:
        confidence = ai_result["confidence"]
        contributing_factors.extend(ai_result.get("extracted_symptoms", []))
        missing_information.extend(ai_result.get("missing_information", []))

        if ai_result.get("contradictions"):
            ai_category = "Manual Review Required"
            uncertainty_level = "high"
            contributing_factors.extend(ai_result["contradictions"])
        elif confidence < 0.55:
            ai_category = "Manual Review Required"
            uncertainty_level = "high"
        elif len(missing_information) >= 2:
            ai_category = "Insufficient Information"
            uncertainty_level = "medium"
        elif confidence < 0.75:
            ai_category = "Routine Review"
            uncertainty_level = "medium"
        else:
            ai_category = "Routine Review"
            uncertainty_level = "low"

    final_category = rule_category if rule_category is not None else ai_category
    if rule_category is not None and _rank(ai_category) < _rank(rule_category):
        # AI signalled something more cautious than the rule engine (e.g. Manual Review
        # due to low confidence) — cannot downgrade the rule outcome, but we surface it
        # by keeping uncertainty high; the deterministic category still wins per spec.
        final_category = rule_category

    reasoning_parts = []
    if triggered_rules:
        reasoning_parts.append(
            f"{len(triggered_rules)} deterministic prototype rule(s) triggered: "
            + ", ".join(t.rule_name for t in triggered_rules) + "."
        )
    if ai_failed:
        reasoning_parts.append("AI interpretation was unavailable; routed conservatively to manual review.")
    elif ai_result:
        reasoning_parts.append(
            f"AI interpretation (confidence {ai_result['confidence']:.2f}) extracted: "
            + (", ".join(ai_result.get("extracted_symptoms", [])) or "no specific symptom terms") + "."
        )
    if not reasoning_parts:
        reasoning_parts.append("No deterministic rules triggered and AI interpretation found no elevated risk indicators.")
    reasoning_summary = " ".join(reasoning_parts) + " Human review and approval is mandatory for all recommendations."

    return PrioritisationRecommendation(
        request_id=request_id,
        recommended_priority=final_category,
        reasoning_summary=reasoning_summary,
        contributing_factors=contributing_factors,
        triggered_rules=triggered_rules,
        missing_information=list(dict.fromkeys(missing_information)),
        uncertainty_level=uncertainty_level,
        recommended_next_action=NEXT_ACTION_BY_CATEGORY[final_category],
        requires_immediate_acknowledgement=final_category == "Immediate Human Review",
        additional_information_required=final_category == "Insufficient Information",
        human_approval_mandatory=True,
        system_version=SYSTEM_VERSION,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
