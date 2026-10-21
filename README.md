# AI-Assisted Healthcare Appointment Request Triage System

**Meridian Health Clinic** — an academic prototype for a university Industry Project.

> ⚠️ **This is an academic prototype, not a production medical device.** It does not diagnose,
> does not provide medical advice, and does not replace a healthcare professional. Deterministic
> emergency/red-flag rules always take precedence over AI output. All data is synthetic/demo data.
> In a real emergency in Australia, call **000**.

---

## 1. Project overview

Traditional online appointment booking collects almost nothing — usually a single free-text
"reason for visit" field — before a patient is added to a queue. This prototype explores whether
a hybrid system can do meaningfully better *without* attempting to diagnose anyone:

1. Collect **structured, adaptive** information about a patient's concern (not a fixed form).
2. Run it through **deterministic, always-on safety rules** first.
3. Layer an **AI-assisted assessment** on top, which can raise urgency but can never lower it
   below whatever the safety rules already decided.
4. Turn the result into an **urgency level, a plain-language explanation, a suggested clinician,
   and a suggested appointment timeframe**.
5. Give the clinician a **structured pre-consultation summary** and require them to review every
   single request — regardless of urgency — before it's treated as final.

## 2. Problem statement

Patients under-describe their symptoms in free-text booking forms; reception/clinical staff have
to triage from very little information, under time pressure. This project asks: does collecting
richer, adaptively-selected structured information, combined with a safety-first hybrid
AI/rules architecture, produce more useful and more consistent appointment prioritisation than a
static form — while remaining fully explainable, auditable, and never autonomous?

## 3. Architecture

Single Next.js application — no microservices, no Docker requirement, works fully offline with a
mock AI provider. See [`docs/architecture.md`](docs/architecture.md) for full diagrams.

```
Patient Interface  →  Booking Flow  →  Adaptive Question Engine
                                              ↓
                                     Safety Rule Engine (Layer 1, deterministic)
                                              ↓
                                     AI Assessment Service (Layer 2, mock or Claude)
                                              ↓
                                     Triage Decision Engine (safety floor + AI, never downgraded)
                                              ↓
                              Appointment Recommendation + Timing Guidance
                                              ↓
                                     Clinician Dashboard (review, override, audit)
```

Key design rule (section 28 of the build brief): **deterministic emergency rule → urgency safety
rules → structured AI assessment → application validation → final triage recommendation → human
clinician review.** The AI can never override or downgrade a triggered safety rule.

## 4. Technology stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4 |
| Backend | Next.js server actions / route handlers (no separate API service) |
| Database | SQLite via Prisma ORM |
| Validation | Zod (server-side, at every form/action boundary) |
| Auth | Cookie-based session for the clinician dashboard, bcrypt-hashed passwords |
| AI | Provider abstraction — `MockAIProvider` (default) and `ClaudeAIProvider` (optional) |
| Testing | Vitest, React Testing Library |
| Icons | lucide-react |

Full rationale: [`docs/architecture.md`](docs/architecture.md).

## 5. Setup instructions

### Prerequisites
- Node.js 20+
- npm

### Install & configure

```bash
npm install
cp .env.example .env
```

`.env` defaults are demo-safe out of the box:

```bash
DATABASE_URL="file:./dev.db"
AI_PROVIDER=mock          # "mock" (default, no API key needed) or "claude"
ANTHROPIC_API_KEY=        # only required if AI_PROVIDER=claude
SESSION_SECRET=dev-only-insecure-secret-change-me
```

### Database setup

```bash
npm run db:migrate     # creates the SQLite schema (already applied once as "init")
npm run db:seed        # seeds doctors, appointment availability, and clinician demo accounts
```

(`npm run db:migrate` also runs the seed automatically the first time, via the `prisma.seed`
config in `package.json`.) Re-run `npm run db:seed` any time to reset demo data — it clears and
re-inserts everything, including regenerating fresh future appointment slots.

### Running locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

| Area | URL |
|---|---|
| Patient site | http://localhost:3000 |
| Book an appointment | http://localhost:3000/book |
| Clinician / reception login | http://localhost:3000/clinician/login |

**Demo clinician logins** (seeded, password `TriageDemo!23` for both):
- `clinician@meridianhealth.demo` (role: clinician)
- `reception@meridianhealth.demo` (role: reception)

### Mock AI mode

The entire application — patient booking, triage, clinician dashboard, and the evaluation
framework — works end-to-end with **zero external API calls** using `AI_PROVIDER=mock` (the
default). This is deliberate: automated tests, demonstrations, and grading should never depend on
API credits or network access. See [`docs/ai-design.md`](docs/ai-design.md) for how the mock
provider works and how to switch to a real Anthropic model.

### Testing

```bash
npm run test         # runs the full Vitest suite once
npm run test:watch   # watch mode
npm run evaluate     # regenerates docs/evaluation-results.md from a live pipeline run
```

136 tests cover the safety rule engine, the urgency-merge logic (including "AI can never
downgrade a safety rule"), adaptive question selection and its category scoping, structured-answer
validation against the question bank, appointment-timing guidance, the mock AI provider and its
schema validation, AI-outage fallback behaviour, the conventional-booking baselines, and a full
run of all 26 synthetic scenarios through the live pipeline. One file
(`tests/booking.integration.test.ts`) runs against a real SQLite database covering the full
submission transaction, slot claiming, the clinician queue and the audit trail; it creates and
disposes of its own test database, so no setup is required. See [`docs/testing-evaluation.md`](docs/testing-evaluation.md).

### Type checking & build

```bash
npx tsc --noEmit
npm run build
```

## 6. Safety design, in short

- **Layer 1 (deterministic, always runs first):** 19 configurable safety rules
  (`src/data/safetyRules.ts`) check only explicit, patient-confirmed structured answers — never
  free text, never AI inference. If an `emergency`-severity rule fires, the result is forced to
  `Emergency` and the AI cannot change that, no matter what it suggests.
- **Layer 2 (AI-assisted):** a schema-validated AI assessment (mock or Claude) suggests an
  urgency level, reasoning, missing information, and a recommended clinician/timeframe. Its
  output is always re-validated against a Zod schema before being trusted; a malformed or failed
  response is treated as a service outage, never coerced into a fake result.
- **Merge:** `src/lib/triage/engine.ts` combines both — the AI may raise urgency above a safety
  floor, never below it. `requiresHumanReview` is always `true`.
- **Outage handling:** if the AI is unavailable, safety rules still run in full; the result falls
  back to the safety floor (or `Insufficient Information` if no rule fired), and is flagged for
  full clinician review — the app never becomes unusable and never fabricates an AI opinion.

Full detail: [`docs/triage-framework.md`](docs/triage-framework.md).

## 7. Demo flow (patient → clinician)

1. Go to `/book`. Enter demo patient details.
2. Describe a concern — e.g. category **Cardiovascular**, "Sudden chest tightness spreading to my arm with sweating."
3. Answer the adaptive questions — chest character, breathing difficulty, **radiation = yes**, **sweating = yes**.
4. The assessment step should show **Emergency**, with the emergency banner and reasoning explained.
5. Continue anyway (a real patient would be told to call 000; the request can still be logged).
6. Pick a doctor and an appointment slot, then confirm.
7. Log in to `/clinician/login` as `clinician@meridianhealth.demo`.
8. The request appears at the top of the queue, flagged Emergency, with the triggered rule
   (`SR-002-CARDIAC-WARNING-CLUSTER`) visible.
9. Open it, review the full structured summary, optionally override, mark reviewed.
10. Visit `/clinician/evaluation` and click **Run evaluation** to see accuracy, under/over-triage
    rates, and a confusion matrix across all 26 synthetic scenarios.

See [`docs/testing-evaluation.md`](docs/testing-evaluation.md) for the full set of demo scenarios
A–E (Routine, Priority, Emergency, Insufficient Information, AI failure).

## 8. Research evaluation method

Two ways to run it:

- **`/clinician/evaluation`** runs every synthetic scenario (`src/data/scenarios.ts`) through the
  real, live triage pipeline and computes overall accuracy, under-triage rate (system urgency
  below expected — the more clinically important error), over-triage rate, and a full confusion
  matrix. Results are persisted (`EvaluationRun` / `EvaluationResult` tables) so past runs aren't
  lost, and the page shows a side-by-side comparison of what a traditional single-field booking
  form captures versus what this system captures for the same scenario.
- **`npm run evaluate`** does the same headlessly, plus the baseline comparison and completeness
  metrics, and regenerates [`docs/evaluation-results.md`](docs/evaluation-results.md) from the run.
  Every number in that report is produced by the code, not typed by hand.

### Headline results

All three workflows scored over the same 26 scenarios
([full report](docs/evaluation-results.md)):

| Workflow | Accuracy | Under-triage | Emergency recall |
|---|---|---|---|
| Conventional — no triage | 19.2% | 65.4% | 0.0% |
| Conventional — keyword triage | 50.0% | 30.8% | 83.3% |
| **This system** | **100.0%** | **0.0%** | **100.0%** |

Information completeness: **8.0 clinical data points per request versus 1.0** for a conventional
free-text form.

**Read the 100% correctly.** The 26 scenarios were written to exercise this system's own logic
paths and the expected urgencies are the author's labels, not a clinical gold standard — so that
figure measures self-consistency, not clinical validity. The comparison against the baselines is
the informative part, and its limits are stated in
[`docs/workflow-comparison.md`](docs/workflow-comparison.md).

## 9. Limitations

This is a prototype built for an academic assessment, not a validated clinical tool. See
[`docs/limitations.md`](docs/limitations.md) for the full, explicit list — including that the 19
safety rules and 26 scenarios are illustrative, not exhaustive; there has been no real-world
patient testing; and AI confidence is not clinical certainty.

## 10. Repository layout

```
src/
  app/              Next.js routes (route groups: (site) = patient-facing, clinician/ = staff)
  components/       patient/, clinician/, triage/, common/
  lib/              ai/, triage/, safety/, questions/, validation/, database/, auth/, evaluation/
  data/             doctors, questions, safetyRules, scenarios, categories, insurance (config, not hardcoded UI)
  types/            central shared TypeScript types
prisma/             schema.prisma, migrations/, seed.ts
tests/              Vitest unit + integration-style tests
docs/               architecture, triage-framework, ai-design, privacy-security, testing-evaluation,
                    evaluation-results, workflow-comparison, safety-explainability-assessment, limitations
scripts/            headless evaluation runner (npm run evaluate)
_archive/           an earlier microservices-based build of this project, preserved for reference (see its ARCHIVE-NOTE.md)
```

## 11. Disclaimer (repeated deliberately — it matters)

This prototype uses simulated information and is not intended for real patient data. It is not a
medical device, has not been clinically validated, and must never be used for real patient
triage, diagnosis, or emergency decision-making. In a real emergency in Australia, call **000**.
