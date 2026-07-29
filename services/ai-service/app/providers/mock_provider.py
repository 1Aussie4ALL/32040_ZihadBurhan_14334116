import re
from typing import Any

from careprior_shared.schemas import AIInterpretationOutput

from .base import AIProvider

MODEL_VERSION = "mock-provider-v1"
PROMPT_VERSION = "extraction-prompt-v1"

SYMPTOM_KEYWORDS: dict[str, list[str]] = {
    "chest discomfort": ["chest pressure", "chest pain", "chest discomfort", "tight chest", "tightness in my chest"],
    "sweating": ["sweating", "sweaty", "perspiring"],
    "arm radiation": ["arm", "towards the arm", "extending to my arm", "radiating"],
    "fainting": ["fainted", "fainting", "passed out", "blacked out"],
    "confusion": ["confused", "confusion"],
    "shortness of breath": ["short of breath", "shortness of breath", "breathless", "difficulty breathing"],
    "fatigue": ["tired", "fatigue", "fatigued", "exhausted"],
}

RISK_INDICATOR_KEYS = {
    "chest discomfort": "chest_discomfort",
    "sweating": "sweating",
    "arm radiation": "arm_radiation",
    "fainting": "fainting",
    "confusion": "confusion",
}

SEVERITY_KEYWORDS = {
    "severe": ["severe", "unbearable", "a lot", "excruciating"],
    "moderate": ["moderate", "quite"],
    "mild": ["mild", "slight", "slightly", "a little"],
}

ONSET_KEYWORDS = {
    "sudden": ["sudden", "suddenly", "all of a sudden", "out of nowhere"],
    "gradual": ["gradual", "gradually", "over time", "slowly"],
}

WORSENING_KEYWORDS = ["worse", "worsening", "getting worse", "progressively"]

DURATION_PATTERN = re.compile(r"(\d+)\s*(hour|hours|day|days|week|weeks)")


class MockAIProvider(AIProvider):
    """Deterministic mock provider (brief section 28: mock enabled by default, no API cost,
    fully reproducible — required for repeatable research-evaluation runs)."""

    def interpret(self, free_text: str, structured_answers: dict[str, Any]) -> AIInterpretationOutput:
        text = (free_text or "").lower()
        structured_answers = structured_answers or {}

        extracted_symptoms: list[str] = []
        possible_risk_indicators: list[str] = []
        for symptom, keywords in SYMPTOM_KEYWORDS.items():
            if any(kw in text for kw in keywords) or structured_answers.get(
                RISK_INDICATOR_KEYS.get(symptom, ""), False
            ):
                extracted_symptoms.append(symptom)
                if symptom in RISK_INDICATOR_KEYS:
                    possible_risk_indicators.append(RISK_INDICATOR_KEYS[symptom])

        severity = structured_answers.get("severity")
        if severity is None:
            for level, keywords in SEVERITY_KEYWORDS.items():
                if any(kw in text for kw in keywords):
                    severity = level
                    break

        onset = structured_answers.get("onset")
        if onset is None:
            for level, keywords in ONSET_KEYWORDS.items():
                if any(kw in text for kw in keywords):
                    onset = level
                    break

        worsening = structured_answers.get("worsening")
        if worsening is None:
            worsening = any(kw in text for kw in WORSENING_KEYWORDS) or None

        duration = None
        duration_match = DURATION_PATTERN.search(text)
        if structured_answers.get("duration_hours") is not None:
            duration = f"{structured_answers['duration_hours']} hours"
        elif duration_match:
            duration = f"{duration_match.group(1)} {duration_match.group(2)}"

        missing_information: list[str] = []
        if duration is None:
            missing_information.append("duration")
        if severity is None:
            missing_information.append("severity")
        if onset is None:
            missing_information.append("onset")

        contradictions: list[str] = []
        text_severity = None
        for level, keywords in SEVERITY_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                text_severity = level
                break
        if (
            structured_answers.get("severity")
            and text_severity
            and structured_answers.get("severity") != text_severity
        ):
            contradictions.append(
                f"Free text suggests '{text_severity}' severity but structured answer recorded "
                f"'{structured_answers.get('severity')}'."
            )

        word_count = len(text.split())
        confidence = 0.9
        uncertainty_reason = None
        if word_count < 8 and not structured_answers:
            confidence = 0.45
            uncertainty_reason = "Free-text description is brief; limited detail available for extraction."
        elif missing_information:
            confidence = max(0.5, 0.9 - 0.15 * len(missing_information))
            uncertainty_reason = f"Missing information: {', '.join(missing_information)}."
        if contradictions:
            confidence = min(confidence, 0.5)
            uncertainty_reason = (uncertainty_reason or "") + " Contradictory answers detected."

        follow_up_topics: list[str] = []
        if onset is None:
            follow_up_topics.append("onset")
        if severity is None:
            follow_up_topics.append("severity")
        if worsening is None:
            follow_up_topics.append("worsening")
        if "chest discomfort" not in extracted_symptoms:
            follow_up_topics.append("chest discomfort")
        if "fainting" not in extracted_symptoms:
            follow_up_topics.append("fainting")
        if "confusion" not in extracted_symptoms:
            follow_up_topics.append("confusion")

        return AIInterpretationOutput(
            extracted_symptoms=extracted_symptoms,
            duration=duration,
            severity=severity,
            onset=onset,
            worsening=worsening,
            possible_risk_indicators=possible_risk_indicators,
            missing_information=missing_information,
            contradictions=contradictions,
            confidence=round(confidence, 2),
            uncertainty_reason=uncertainty_reason.strip() if uncertainty_reason else None,
            recommended_follow_up_topics=follow_up_topics,
            model_version=MODEL_VERSION,
            prompt_version=PROMPT_VERSION,
        )
