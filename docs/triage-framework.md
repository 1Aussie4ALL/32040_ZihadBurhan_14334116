# Triage Framework

## Hybrid architecture

Two layers, always evaluated in this order, with a final application-logic merge:

1. **Layer 1 — Deterministic safety rules** (`src/data/safetyRules.ts`,
   `src/lib/safety/engine.ts`). Pure, synchronous, no AI, no network. Given a complaint category
   and the patient's structured answers, every rule is evaluated and a **safety floor** is
   computed: `Emergency` if any `emergency`-severity rule fired, else `Urgent` if any
   `urgent`-severity rule fired, else no floor.
2. **Layer 2 — AI-assisted assessment** (`src/lib/ai/`). A structured input (never raw
   uncontrolled text alone) is sent to an `AIProvider`, which returns a schema-validated
   suggested urgency, reasoning, risk indicators, missing information, and recommended
   clinician/timeframe.
3. **Merge** (`src/lib/triage/engine.ts`, `mergeTriageResult`): the final urgency is
   `max(safetyFloor, aiSuggestion)` on the ordinal scale
   `InsufficientInformation < Routine < Priority < Urgent < Emergency`. The AI can raise urgency
   above a floor; it can never lower it below one. `requiresHumanReview` is always `true`.

This is a deliberate, explicit implementation of the brief's hierarchy:

```
Deterministic emergency rule → Urgency safety rules → Structured AI assessment
  → Application validation → Final triage recommendation → Human clinician review
```

## Prototype rule framework — explicitly not a complete clinical protocol

`src/data/safetyRules.ts` contains **19 rules** built from representative simulated scenarios,
covering the illustrative categories in the project brief (severe breathing difficulty, cardiac
warning clusters, stroke-like presentation, uncontrolled bleeding, anaphylaxis signs, imminent
self-harm risk, severe acute deterioration, meningitis-pattern fever, GI bleeding, neurovascular
compromise, self-harm ideation without a plan, persistent vomiting with fever, prolonged high
fever, visible deformity/open wound, spreading rash with fever, coughing blood, and cyanosis).
This is **not** a complete or clinically validated triage protocol — see
[`limitations.md`](limitations.md).

Each rule is data, not code (`SafetyRuleDefinition`):

```ts
{
  ruleId: "SR-002-CARDIAC-WARNING-CLUSTER",
  trigger: { operator: "AND", checks: [
    { questionId: "cv_radiates", equals: true },
    { questionId: "cv_sweating", equals: true },
  ]},
  severity: "emergency",
  result: "Emergency",
  patientMessage: "...call 000 or attend an emergency department now.",
  clinicianFlag: "EMERGENCY — possible cardiac warning cluster",
  explanation: "Chest discomfort radiating to the arm/jaw/back, combined with sweating or nausea.",
}
```

Rules check **only** explicit structured answers to the adaptive questions — never the patient's
free-text description and never an AI inference — so the safety floor is fully deterministic and
reproducible from the same inputs every time.

## Urgency classification

| Level | Meaning |
|---|---|
| **Emergency** | Potential immediate threat requiring emergency assessment. |
| **Urgent** | Requires prompt professional assessment; should not wait for a routine appointment. |
| **Priority** | Should be reviewed sooner than a standard routine booking. |
| **Routine** | Suitable for standard appointment availability. |
| **Insufficient Information** | Not enough information was provided to safely determine a priority. |

Every `TriageResult` includes: `urgencyLevel`, `reasoningSummary`, `triggeredRules`,
`riskIndicators`, `recommendedTimeframe`, `aiConfidence`, `requiresHumanReview` (always `true`),
and `finalSource` (`safety_rule` | `ai` | `ai_unavailable_fallback`), plus a richer
`clinicianExplanation` for the staff-facing view.

## Adaptive questioning engine

Questions are configuration data (`src/data/questions.ts`), not hardcoded UI, using the model:
`questionId, category, questionText, answerType, options, triggerConditions, redFlag,
followUpQuestions`. `src/lib/questions/engine.ts` selects:

- **Base set** (the initial ~8–10): all `core` questions (asked regardless of category) plus any
  category question whose only trigger condition is the category match itself.
- **Dynamic follow-ups**: questions unlocked once a prior answer satisfies their
  `triggerConditions` (e.g. `cv_sweating` only appears once `cv_radiates = true` or
  `core_severity >= 7`; `resp_lips_face_blue` only appears once breathing difficulty is
  moderate/severe). Re-evaluated after every answer, so the "next question" is always whatever is
  currently relevant, never a fixed sequence.

## Explainability

Two levels, matching the brief's distinction between patient-facing and clinician-facing detail:

- **Patient-facing** (`AssessmentResult`): a short bullet list — "This appointment was classified
  as Priority because: symptoms were reported as worsening; severity was reported as 7/10; ..." —
  built from the safety-rule explanations (if any fired) plus the AI's `reasoning` array. No
  internal chain-of-thought is ever shown.
- **Clinician-facing** (`clinicianExplanation` on `TriageResult`, rendered on the request detail
  page): triggered deterministic rule IDs, the major assessment factors, what information was
  missing, the AI's raw recommendation with its confidence, and a one-line statement of how the
  final decision was reached (e.g. *"A deterministic safety rule set a mandatory Emergency floor,
  which the AI assessment cannot lower."*).

## Clinician override & auditability

Clinicians can override the system's urgency (`overrideUrgency` + a required `overrideReason`
when it differs from the system result), add a free-text note, and mark a request reviewed. Both
the original system result and any override are retained (`TriageAssessment.urgencyLevel` is
never mutated; the override lives in a separate `ClinicianReview` row), so nothing is silently
overwritten. Every meaningful event — request created, red flag detected, AI assessment
generated/unavailable, final urgency assigned, timing warning shown/overridden, clinician
reviewed, clinician overrode classification — is written to an append-only `SystemAuditLog`.
