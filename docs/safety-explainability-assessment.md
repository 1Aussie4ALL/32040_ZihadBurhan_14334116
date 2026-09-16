# Explainability, Privacy, Security & Patient-Safety Assessment

Work package **6.6**. This is an assessment of the prototype as built — what it does, where the
residual risk sits, and what a real deployment would still need. Controls are cited to the code
that implements them, so each claim can be checked rather than taken on trust.

Companion documents: [`privacy-security.md`](privacy-security.md) (implemented practices),
[`triage-framework.md`](triage-framework.md) (the rule set), [`limitations.md`](limitations.md)
(what this prototype is not).

---

## 1. Explainability assessment

The design rule is that **no urgency level may be presented without the reason for it**. Nothing
in the system produces a bare classification.

### What is explained, and to whom

| Audience | What they see | Source |
|---|---|---|
| Patient | The urgency level, the reasoning behind it in plain language, what information was missing, and an explicit statement that confidence is not clinical certainty | `AssessmentResult.tsx` |
| Clinician | Which deterministic rules fired (by ID and description), the major assessment factors, missing information, what the AI suggested with its confidence, and how the application reached the final decision | `ClinicianExplanation` in `src/types/index.ts`, built in `mergeTriageResult` |
| Auditor | An append-only event log per request: created, red flag detected, AI generated or unavailable, final urgency assigned, timing warning shown/overridden, clinician reviewed, clinician overrode | `SystemAuditLog`, `src/lib/database/audit.ts` |

### Traceability of a decision

Every final urgency can be traced to exactly one of four causes, recorded in `finalSource`:

| `finalSource` | Meaning |
|---|---|
| `safety_rule` | A deterministic rule set a floor at or above the AI's suggestion |
| `ai` | No rule fired, or the AI raised urgency above the floor |
| `ai_unavailable_fallback` | The AI could not be reached or returned invalid output; the result rests on safety rules alone |

`buildFinalDecisionExplanation` turns each case into a sentence stating *which layer decided and
why*, so a clinician never has to guess whether they are looking at a rule or a model output.

### Why the deterministic layer carries the safety-critical decisions

The 19 safety rules check only explicit, patient-confirmed structured answers — never free text,
never model inference (`src/lib/safety/engine.ts`). This makes the safety-critical path fully
inspectable: a rule either matched a recorded answer or it did not, and the same answers always
produce the same outcome. The AI layer contributes explanatory value and can raise urgency, but it
cannot lower a floor the rules established, so a model failure can never silently downgrade a
red flag.

### Explainability gaps

- **The mock provider's "reasoning" is generated from a scoring heuristic**, not a model
  explaining itself. With `AI_PROVIDER=claude` the reasoning is genuine model output, and is
  therefore subject to the usual caveat that a language model's stated reasoning may not reflect
  its actual computation.
- **Confidence is not calibrated.** It reflects how much structured information was available, not
  a probability that the assessment is medically correct. The UI says so wherever it appears, but
  a number between 0 and 1 invites over-reading regardless.
- **Rule descriptions are written for clinicians, not patients.** The patient-facing message is
  deliberately separate (`patientMessage` vs `clinicianFlag`) and avoids implying a diagnosis, but
  a patient who wants the full rule detail cannot see it.

---

## 2. Patient-safety assessment

### Hazard analysis

The rows are ordered by clinical severity of the outcome, not likelihood.

| # | Hazard | Cause | Control in this build | Residual risk |
|---|---|---|---|---|
| H1 | An emergency presentation is booked as a routine appointment | AI misclassification | Deterministic rules run first and set a floor the AI cannot lower; `mergeTriageResult` takes the higher of floor and AI suggestion | **Medium** — a presentation with no matching rule and no AI escalation would pass. The rule set is illustrative, not exhaustive |
| H2 | A red flag is missed because the question was never asked | Adaptive questioning skips a relevant follow-up | Category-scoped question selection with unconditional core questions; follow-ups unlock from prior answers | **Medium** — a red flag outside the 19 modelled rules has no question behind it |
| H3 | Patient treats the output as a diagnosis and does not seek care | Over-trust in an AI result | Disclaimer on every relevant surface; emergency banner instructs calling 000; wording avoids diagnostic claims and offers no reassurance | **Medium** — cannot be engineered away; a patient may still under-react |
| H4 | AI outage silently produces a falsely low urgency | Provider failure treated as a valid result | A failed or schema-invalid response is treated as an outage, never coerced; result falls back to the safety floor, or `InsufficientInformation`, and is flagged | **Low** — covered by `tests/urgencyMapping.test.ts` and `tests/aiProvider.test.ts` |
| H5 | A tampered client forces a lower urgency | Client-supplied triage result trusted | Triage is recomputed server-side at submission from the submitted answers; the client's result is never stored | **Low** |
| H6 | Out-of-range or wrong-typed answers distort the assessment | Client bug or tampering | Answers validated against the question bank's declared type, option list and scale range; invalid values rejected, never coerced | **Low** — covered by `tests/answerValidation.test.ts` |
| H7 | Stale answers from a changed category fire the wrong rules | Wizard retains answers across a category change | Answers scoped to the selected category before reaching the safety engine, the AI input, or storage | **Low** — covered by `tests/answerValidation.test.ts` and the integration test |
| H8 | Clinician assumes an empty queue means no waiting requests | A load error renders as an empty list | The clinician error boundary states explicitly that requests may be waiting and must not be read as an empty queue | **Low** |
| H9 | An urgent request waits because the patient chose a distant slot | Patient picks any available time | Timing guidance compares the chosen slot against the urgency's recommended window and warns; the override is recorded in the audit log | **Medium** — the patient may still proceed, by design; a clinician sees the flag on review |
| H10 | Emergency advice is not perceived by a screen-reader user | Visual-only alerting | The emergency banner is `role="alert"` with `aria-live="assertive"`; urgency is always rendered as text, never colour alone | **Low** — covered by `tests/UrgencyBadge.test.tsx` |

### The controls that carry the most weight

1. **Human review is not optional.** `requiresHumanReview` is typed as the literal `true` — not a
   boolean — so no code path can set it to `false` without a type error. Every request is queued
   for a clinician regardless of urgency.
2. **The AI can only ever raise urgency.** Asserted directly in `tests/safetyRules.test.ts` with an
   AI result that explicitly suggests a *lower* level than a triggered emergency rule.
3. **Failure is never silent.** An unavailable AI, an unassessable request, and an unloadable page
   each produce an explicit, visible state rather than a plausible-looking wrong answer.

### Safety limitations that remain

- The rule set covers illustrative categories from the project brief. It is not ATS, MTS or ESI,
  and has had no clinical review.
- Paediatric, pregnancy-related and geriatric presentations have no dedicated rules; age is used
  only to recommend a doctor, never to adjust urgency.
- The system cannot detect a patient who under-reports. Every rule depends on an honest answer.

---

## 3. Privacy assessment

Implemented practices are listed in [`privacy-security.md`](privacy-security.md). This section
assesses what remains.

| Principle | Status | Assessment |
|---|---|---|
| Collection limitation | **Met** | Name, date of birth, optional sex, phone, email. No Medicare number, address or government ID |
| Purpose specification | **Met in design** | Every field is used for booking or triage; nothing is collected speculatively |
| Use limitation | **Partial** | No secondary use exists, but nothing technically prevents it — there is no access-control layer distinguishing clinical from administrative access |
| Data quality | **Met** | Answers validated against the question bank; question text snapshotted at time of asking |
| Security safeguards | **Partial** | See section 4 — no encryption at rest, no MFA, no rate limiting |
| Openness | **Met** | The disclaimer, the reasoning and the limitations are stated to the patient in the flow |
| Individual participation | **Not met** | No patient account, so no self-service access, correction or deletion. A patient cannot see or amend what was stored about them |
| Accountability | **Partial** | Append-only audit log exists; no data custodian, retention schedule or breach process |

**Retention is the largest gap.** There is no retention period and no deletion process — records
persist indefinitely. A real deployment would need an explicit schedule under the applicable
health-records legislation, and `PatientAnswer` rows are the sensitive part: they are a structured
symptom history, more disclosive than the free-text field they replace. Collecting better
information is also collecting more sensitive information, and that trade-off is inherent to this
project's central claim.

**Consent is absent by design.** The brief asks for booking without a complicated account, so
there is no consent-capture step. A production version would need explicit consent before
processing health-adjacent information, recorded with what was consented to and when.

---

## 4. Security assessment

### Implemented

| Control | Implementation |
|---|---|
| Input validation at every trust boundary | Zod schemas per server action, plus question-bank validation of structured answers |
| Server-authoritative triage | Recomputed at submission; client results never trusted |
| Password storage | bcrypt, never logged or returned |
| Session management | httpOnly, `sameSite=lax` cookie holding an opaque id, checked against a `Session` row per request with a 12-hour expiry |
| Route separation | Patient and clinician route trees are structurally separate; every clinician page calls `requireClinician()` |
| Secret handling | Read only inside `server-only` modules, making client-bundle import a build error |
| AI output validation | Strict schema; invalid output treated as an outage |
| Injection resistance | Prisma parameterised queries throughout; no raw SQL |
| Audit trail | Append-only; rows are inserted, never updated or deleted |

### Gaps — deliberate, and disqualifying for production

| Gap | Risk | Why it is acceptable here |
|---|---|---|
| No rate limiting or brute-force protection on login | Credential guessing against two known demo accounts | Local demo, synthetic accounts, no real data |
| No session revocation list | A stolen cookie stays valid until expiry | Same |
| No MFA | Single-factor access to all patient records | Same |
| No encryption at rest | SQLite file is readable by anyone with filesystem access | Synthetic data only |
| No CSRF token beyond `sameSite=lax` | Cross-site state change via a top-level GET-initiated flow | Server actions are POST-only and `sameSite=lax` blocks cross-site POST |
| No authorisation granularity | `clinician` and `reception` roles exist but are not enforced differently | Prototype scope; reception arguably should not see full symptom detail |
| No dependency or container scanning | Known-vulnerable transitive dependency | No production deployment target |
| Errors logged to console | Detail lost in a real incident | No log aggregation in a local demo |

The `reception` role is the most substantive of these. It exists in the data model and is
displayed, but a reception user currently sees exactly what a clinician sees — including the full
structured symptom history. Under a minimum-necessary-access principle that is wrong, and it is
the first authorisation change a real build should make.

### Threat model note

No formal threat modelling exercise (STRIDE or equivalent) has been carried out. The controls above
were derived from the project brief's requirements and ordinary web-application practice, not from
a systematic enumeration of threats — which is itself a gap worth stating.

---

## 5. Overall conclusion

For its stated purpose — an academic prototype demonstrating a safety-first hybrid rules/AI triage
architecture — the explainability and patient-safety properties are the strongest part of the
build: the deterministic layer is inspectable, the AI cannot downgrade it, failure states are
explicit rather than silent, and every request reaches a human.

The privacy and security posture is adequate for a local demonstration with synthetic data and
**not adequate for any real deployment**. The specific blockers are the absence of retention and
consent handling, the lack of patient access to their own records, role-based access that is
displayed but not enforced, and the absence of encryption at rest, MFA and rate limiting.

None of these are oversights; each is listed in [`limitations.md`](limitations.md) and was traded
against the core safety, triage and evaluation requirements within a fixed academic timeframe.
