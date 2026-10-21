# Testing & Evaluation

## Automated test suite

`npm run test` (Vitest). 136 tests across 15 files. Most are logic-level (no browser required); one file runs against a real database, and component tests render the booking wizard, validation pop-up and urgency badge in a simulated browser (jsdom).

| File | Covers |
|---|---|
| `tests/safetyRules.test.ts` | Individual rule triggering (including partial-condition non-triggering), and the core guarantee that **an emergency deterministic rule can never be downgraded by the AI** — tested with an AI result that explicitly suggests a *lower* urgency. |
| `tests/urgencyMapping.test.ts` | `mergeTriageResult` in isolation: AI-only path (no floor), AI unavailable with/without a floor, `requiresHumanReview` always `true`, AI raising urgency above an Urgent floor. |
| `tests/adaptiveQuestions.test.ts` | Initial question set correctness, dynamic follow-up unlocking (e.g. `cv_sweating` only appears after `cv_radiates=true` or high severity), full walk-through termination (no infinite loop), no question re-asked. |
| `tests/timing.test.ts` | Appointment-timing guidance for every urgency level, including the exact worked example from the brief (Priority + 6 days away is flagged) and the Emergency always-inappropriate case. |
| `tests/aiProvider.test.ts` | Mock provider: insufficient-information detection, schema-valid output on every call, urgency increasing with severity/worsening, and that a malformed AI response is rejected by the schema. |
| `tests/evaluation.test.ts` | Runs **all 26 synthetic scenarios** through the live pipeline; asserts zero under-triage on Emergency scenarios, confusion-matrix/summary internal consistency, and an overall accuracy regression guard. |
| `tests/answerValidation.test.ts` | The structured-answer guardrail: out-of-range scale values, wrong-typed booleans and unoffered select options are rejected rather than coerced; another category's answers are dropped; and neither a foreign follow-up question nor a foreign category's emergency rule can be reached from stale answers. |
| `tests/baselineComparison.test.ts` | The conventional-booking baselines and the information-completeness metric that back `evaluation-results.md` — including that keyword triage cannot grade severity, cannot express "insufficient information", and misses the scenario whose risk appears only in a structured answer. |
| `tests/booking.integration.test.ts` | **Integration, against a real SQLite database**: the full `submitAppointmentRequest` transaction, structured answers surviving the JSON round-trip, slot claiming (including double-booking and wrong-doctor rejection), stale cross-category answers being excluded from storage, urgency-ordered queue, clinician override + audit attribution, and review idempotency. |
| `tests/UrgencyBadge.test.tsx` | One component-level test (React Testing Library) confirming urgency is always rendered as visible text, not colour alone. |

### Integration tests and the test database

`tests/booking.integration.test.ts` runs against a real SQLite database rather than mocks, so it
covers what the unit tests deliberately leave out: the Prisma transaction, slot claiming under
contention, JSON round-tripping of structured answers, and the audit trail. This is the same code
path the UI's server actions call.

`tests/globalSetup.ts` creates a disposable `prisma/test.db` via `prisma db push --force-reset`
and seeds doctors, slots and a clinician into it. The demo `prisma/dev.db` is never touched, and
the test database is deleted afterwards. No extra setup is needed — `npm run test` handles it.

## Evaluation framework

`src/lib/evaluation/runner.ts` runs every scenario in `src/data/scenarios.ts` through the same
`runTriageDetailed` pipeline a live request uses (safety rules → AI → merge), and records, per
scenario: `scenarioId`, `expectedUrgency`, `systemUrgency`, `correct`, `underTriaged`,
`overTriaged`, `triggeredRules`, the raw `aiResult`, and the `finalResult`. From that it computes:

- **Overall accuracy** = correct / total.
- **Under-triage rate** = scenarios where system urgency < expected (the more clinically
  important error — the safety-critical thing to minimise).
- **Over-triage rate** = scenarios where system urgency > expected.
- **Confusion matrix** = expected × system urgency counts across all five levels.

Results are persisted (`EvaluationRun` + `EvaluationResult` tables) so a run's history isn't lost,
and the clinician-facing `/clinician/evaluation` page lets you re-run it on demand and see the
matrix and per-scenario breakdown.

### Synthetic scenario set

26 scenarios (`src/data/scenarios.ts`), distributed:

| Expected urgency | Count | What they exercise |
|---|---|---|
| Emergency | 5 | Cardiac warning cluster, severe breathing + cyanosis, stroke-like sudden onset, anaphylaxis signs, imminent self-harm |
| Urgent | 5 | GI bleeding, neurovascular compromise, self-harm without a plan, persistent vomiting + fever, prolonged high fever |
| Priority | 5 | Moderate, worsening presentations with no safety rule triggered — relies entirely on the AI layer |
| Routine | 5 | Mild/stable presentations across several categories |
| Insufficient Information | 4 | Vague or minimal-detail concerns |
| Edge cases | 2 | A contradictory case (very high severity, described as "improving") and a case where a low self-rated severity is still correctly escalated because a safety-critical answer is present |

### Information completeness comparison

`/clinician/evaluation` also shows a side-by-side comparison of a traditional single-field
booking ("Reason: stomach pain") against what this system captures for the same scenario
(complaint, duration, severity, progression, associated symptoms, risk indicators) — demonstrating
project value beyond raw classification accuracy, as the brief requests.

## Headless evaluation runner

```bash
npm run evaluate
```

Runs all 26 scenarios through the real pipeline, runs the same scenarios through both
conventional-booking baselines, measures information completeness, and regenerates
[`evaluation-results.md`](evaluation-results.md) and `evaluation-results.json` from the numbers it
just produced. Nothing in that report is typed by hand, so it cannot drift from what the code
actually does. Unlike `/clinician/evaluation`, it does not touch the database, so it runs from a
clean checkout.

See also [`workflow-comparison.md`](workflow-comparison.md) for the workflow-level comparison
(work package 6.4) and [`safety-explainability-assessment.md`](safety-explainability-assessment.md)
for the explainability, privacy, security and patient-safety assessment (work package 6.6).

## Demo scenarios A–E

| Scenario | How to trigger | Expected result |
|---|---|---|
| **A — Routine** | Category Respiratory, "just a mild cold", severity 2, improving | `Routine`, suitable GP, ordinary appointment availability |
| **B — Priority** | Category Abdominal, worsening pain over 1–3 days, severity 5, no bleeding/persistent vomiting | `Priority`, earlier-appointment guidance if a slot >48h is picked, full clinician summary generated |
| **C — Emergency** | Category Cardiovascular, chest tightness radiating to the arm **and** sweating = yes | `Emergency` — deterministic `SR-002-CARDIAC-WARNING-CLUSTER`, red emergency banner, clearly flagged in the clinician queue |
| **D — Insufficient Information** | Skip through the question flow answering almost nothing (severity left unanswered, category "Other") | `InsufficientInformation`, missing-information list shown, flagged for full human review |
| **E — AI failure** | Set `AI_PROVIDER=claude` with an invalid/empty `ANTHROPIC_API_KEY`, or temporarily block network access | Safety rules still run in full; result falls back to the safety floor (or Insufficient Information if none fired); `finalSource = "ai_unavailable_fallback"`; app remains fully usable |

All five are directly reproducible through the running app, and A–D are also present verbatim (or
near-verbatim) in the synthetic scenario set so they're covered by the automated evaluation too.
