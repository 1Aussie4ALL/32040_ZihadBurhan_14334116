from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Strict AI interpretation output schema (brief Module 3 / section 14).
# The model must never return a diagnosis field. Any provider adapter must
# validate against this schema before its output can reach the prioritisation
# pipeline; invalid output is rejected, never passed through.


class AIInterpretationOutput(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    extracted_symptoms: list[str] = Field(default_factory=list)
    duration: str | None = None
    severity: str | None = None
    onset: str | None = None
    worsening: bool | None = None
    possible_risk_indicators: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    uncertainty_reason: str | None = None
    recommended_follow_up_topics: list[str] = Field(default_factory=list)
    model_version: str
    prompt_version: str

    @field_validator("extracted_symptoms", "possible_risk_indicators", mode="before")
    @classmethod
    def _no_diagnosis_field_leak(cls, value: list[str]) -> list[str]:
        return value


PriorityCategory = Literal[
    "Routine Review",
    "Priority Review",
    "Immediate Human Review",
    "Insufficient Information",
    "Manual Review Required",
]

# Deterministic precedence order — a lower index always outranks a higher one.
# AI output must never downgrade a rule-driven outcome (brief section 15/16).
PRECEDENCE_ORDER: list[PriorityCategory] = [
    "Immediate Human Review",
    "Priority Review",
    "Manual Review Required",
    "Insufficient Information",
    "Routine Review",
]


class RuleTriggerOut(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    category: PriorityCategory
    explanation: str
    matched_answer: str


class PrioritisationRecommendation(BaseModel):
    request_id: str
    recommended_priority: PriorityCategory
    reasoning_summary: str
    contributing_factors: list[str]
    triggered_rules: list[RuleTriggerOut]
    missing_information: list[str]
    uncertainty_level: Literal["low", "medium", "high"]
    recommended_next_action: str
    requires_immediate_acknowledgement: bool
    additional_information_required: bool
    human_approval_mandatory: bool = True
    system_version: str
    generated_at: str
