# AI Design

## Principle

The AI assesses an **appointment request**, not a patient's medical condition. It is not
diagnosing disease. Its job is to help decide how urgently a request should be reviewed, explain
why, and suggest a clinician type and timeframe — always as one input to a larger decision that
includes deterministic safety rules and mandatory human review.

## Structured input, not raw free text alone

`AIAssessmentInput` (`src/types/index.ts`) is assembled server-side
(`src/lib/triage/engine.ts::buildAIInput`) from the patient's category, concern text, and
structured adaptive-question answers:

```ts
{
  primaryConcern: string;
  category: ComplaintCategory;
  duration: string;
  severity: string;
  worsening: string;
  symptoms: string[];
  associatedSymptoms: string[];
  riskIndicators: string[];   // drawn from which safety rules already fired
  answers: AnsweredQuestion[];
}
```

The concern text is included, but the model is not asked to freelance from it alone — it's one
field among many structured signals, and `riskIndicators` explicitly tells the model which
deterministic rules already fired, keeping the two layers consistent rather than contradictory.

## Structured, schema-validated output

The AI must return exactly:

```ts
{
  suggestedUrgency: UrgencyLevel;
  summary: string;
  reasoning: string[];
  riskIndicators: string[];
  missingInformation: string[];
  recommendedClinicianType: string;
  recommendedTimeframe: string;
  confidence: number; // 0–1
}
```

validated against a Zod schema (`src/lib/ai/schema.ts`) **before** it is used anywhere — including
the mock provider's own output (defence in depth: `runAIAssessment` in `aiService.ts`
re-validates whatever a provider returns, so a provider bug can't silently produce bad data).
Anything that fails validation, fails to parse as JSON, or throws is treated identically to an
outage: `{ failed: true, output: null }`. The final triage engine never manufactures a fake AI
result from a failure — see [`triage-framework.md`](triage-framework.md).

## Provider abstraction

```
AIService (src/lib/ai/aiService.ts)
├── MockAIProvider   (src/lib/ai/mockProvider.ts) — default, deterministic, free, offline
└── ClaudeAIProvider (src/lib/ai/claudeProvider.ts) — optional, real model
```

Selected via `AI_PROVIDER` env var (`mock` | `claude`). If `claude` is selected but
`ANTHROPIC_API_KEY` is missing, the service falls back to the mock provider rather than crashing
— a misconfiguration is not allowed to make the app unusable.

`ClaudeAIProvider` imports `"server-only"` so it is a build-time error to ever import it from
client code, keeping `ANTHROPIC_API_KEY` server-side only (section 22 requirement). It sends a
system prompt instructing the model to respond with **only** a JSON object matching the schema,
extracts the first JSON object from the response, parses it, and validates it — any failure at
any step returns `{ failed: true }`.

## Mock provider design

`MockAIProvider` simulates the kind of structured judgement an LLM would return, using only the
same structured input a real provider receives (no shortcuts, no access to which category the
scenario "should" be):

1. If severity is missing, or fewer than 2 questions were meaningfully answered, return
   `InsufficientInformation` with low confidence — mirroring how a real model should behave when
   given too little to work with, rather than guessing.
2. Otherwise compute a weighted score from severity, whether symptoms are worsening, acute-onset
   + high severity, associated-symptom count, and the number of risk indicators already
   identified by the safety layer — then map the score to an urgency band.
3. Confidence is reduced by how much information is missing and how few questions were answered —
   `confidence` reflects *information completeness*, explicitly not clinical certainty (and the
   UI says so wherever confidence is shown).

This is deterministic and reproducible: the same input always produces the same output, which is
what makes automated testing and grading possible without API access — see
[`testing-evaluation.md`](testing-evaluation.md).

## Switching to a real model

```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
# optional, defaults to claude-sonnet-5
ANTHROPIC_MODEL=claude-sonnet-5
```

No other code changes are required — the triage engine, safety rules, and UI are all provider-
agnostic.
