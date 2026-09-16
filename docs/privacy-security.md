# Privacy & Security

## This prototype uses simulated information and is not intended for real patient data.

Every patient, doctor, and appointment record in this application is synthetic. Do not enter real
personal or medical information into this prototype.

## Security practices implemented

- **Server-side validation everywhere.** Every server action re-validates its input with Zod
  (`src/lib/validation/schemas.ts`) — client-side validation is UX only, never trusted alone.
- **Triage is recomputed server-side at submission**, not accepted from the client, so a tampered
  browser cannot force a lower urgency into the database (see `submitAppointmentRequest` in
  `src/lib/database/requests.ts`).
- **Structured answers are validated against the question bank that produced them**
  (`src/lib/validation/answers.ts`). A schema check alone only proves the submission is a map of
  JSON values; this layer additionally enforces each question's declared type, option list and
  scale range, so an out-of-range severity cannot inflate the AI's scoring and a wrong-typed
  red-flag answer cannot silently fail to match a safety rule. Invalid values are rejected, never
  coerced — a coerced answer could move the final urgency in either direction, including down.
  Answers belonging to a different complaint category (possible when a patient goes back and
  changes their category) are dropped before reaching the safety engine, the AI input, or storage.
- **No secrets in client code.** `ANTHROPIC_API_KEY` and `SESSION_SECRET` are read only from
  `process.env` inside modules marked `"server-only"`, which makes it a build error to
  accidentally import them into a client bundle.
- **Password hashing.** Clinician passwords are hashed with bcrypt (`src/lib/auth/password.ts`),
  never stored or logged in plain text.
- **Session-based auth, not client-trusted state.** The clinician dashboard uses an httpOnly,
  `sameSite=lax` cookie holding an opaque session id, looked up against a `Session` table on every
  request (`src/lib/auth/session.ts`). Nothing about identity or role is encoded client-side.
- **Role separation.** Patient-facing routes (`(site)`) and staff routes (`clinician/`) are
  structurally separate route trees with their own layouts; every clinician page calls
  `requireClinician()` and redirects unauthenticated visitors to `/clinician/login`.
- **Output validation for AI responses.** Every AI response — mock or real — is validated against
  a strict Zod schema before use; anything that fails is treated as an outage (see
  [`ai-design.md`](ai-design.md)), never silently trusted.
- **Minimum necessary data collection.** Patient fields are limited to what a booking genuinely
  needs (name, date of birth, optional sex, phone, email); sex/gender is optional; no Medicare
  number, address, or government ID is collected.
- **Audit logging.** Every meaningful state change (request created, red flag detected, AI
  assessment generated/failed, final urgency assigned, timing warning shown/overridden, clinician
  reviewed, clinician override) is written to an append-only `SystemAuditLog` table.

## What production deployment would additionally require

This prototype intentionally does **not** implement the following — they are out of scope for a
12-week academic build but would be required before any real deployment:

- Formal threat modelling and a professional security review/penetration test.
- Encryption at rest for the database (SQLite here has no built-in encryption).
- Server-side session/token revocation lists, rate limiting, and brute-force login protection.
- Multi-factor authentication for clinician accounts.
- A real identity/consent framework (this prototype has no patient login or consent capture step
  — see [`limitations.md`](limitations.md)).
- Formal data retention and deletion policies, and a data processing agreement if a real AI
  provider were used with real patient data.
- Clinical governance sign-off, and likely a regulatory/therapeutic-goods assessment depending on
  jurisdiction, before the triage output could inform real clinical prioritisation.
- Centralised secrets management (a `.env` file is adequate for a local demo, not for production).

## Data minimisation & retention (design discussion)

The data model stores only what each feature needs: `Question` and `SafetyRuleDefinition` are
kept as versioned code/config rather than database rows (nothing to retain or leak there).
`PatientAnswer` snapshots the question text at time of asking rather than duplicating the whole
question bank per answer. Safety rule results are persisted only for rules that actually
triggered, not a row per rule per request. There is no scheduled data-retention job in this
prototype — for a real deployment, patient records would need an explicit retention period and
deletion process under the relevant health-records legislation.

## Consent (design discussion)

Because there is no patient account system by design (the brief asks for booking "without needing
a complicated account"), there is no formal consent-capture step in this build. A production
version would need an explicit consent flow before collecting and processing health-adjacent
information, and a clear record of what the patient consented to and when.
