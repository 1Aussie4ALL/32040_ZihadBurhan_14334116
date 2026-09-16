# Architecture

## System architecture

```mermaid
flowchart TD
    P[Patient Interface] --> B[Booking Flow]
    B --> Q[Adaptive Question Engine]
    Q --> S[Safety Rule Engine — Layer 1]
    S --> A[AI Assessment Service — Layer 2]
    A --> T[Triage Decision Engine]
    T --> R[Appointment Recommendation + Timing Guidance]
    R --> D[Clinician Dashboard]
    T -.persists.-> DB[(SQLite via Prisma)]
    D -.reads/writes.-> DB
```

The Safety Rule Engine always executes before the AI Assessment Service, and the Triage
Decision Engine can never let the AI lower a result the safety rules already set.

## Patient workflow

```mermaid
flowchart LR
    Start([Enter website]) --> Details[Step 1: Details]
    Details --> Concern[Step 2: Your Concern]
    Concern --> Questions[Step 3: Adaptive Questions]
    Questions --> Assess[Step 4: Assessment]
    Assess --> Doctor[Step 5: Doctor]
    Doctor --> Appt[Step 6: Appointment]
    Appt -->|timing OK| Confirm[Step 7: Confirmation]
    Appt -->|timing too late| Warn[Timing warning:<br/>view earlier / continue anyway]
    Warn --> Confirm
```

## Sequence diagram — submitting a request

```mermaid
sequenceDiagram
    participant U as Patient (browser)
    participant W as BookingWizard (client)
    participant SA as Server Action
    participant SR as Safety Rule Engine
    participant AI as AI Service
    participant DB as SQLite (Prisma)

    U->>W: Complete details, concern, questions
    W->>SA: assessTriageAction(category, concern, answers)
    SA->>SR: evaluateSafetyRules()
    SR-->>SA: safety floor + triggered rules
    SA->>AI: runAIAssessment(structured input)
    AI-->>SA: validated AIAssessmentOutput (or failure)
    SA->>SA: mergeTriageResult(floor, aiResult)
    SA-->>W: TriageResult (urgency never below the floor)
    U->>W: Choose doctor + appointment slot
    W->>SA: submitBookingAction(full payload)
    SA->>SR: re-run safety rules (server-side, not trusted from client)
    SA->>AI: re-run AI assessment
    SA->>DB: create Patient, AppointmentRequest, PatientAnswers,<br/>TriageAssessment, SafetyRuleResults, AuditLogs (one transaction)
    DB-->>SA: appointmentRequestId
    SA-->>W: redirect to confirmation page
```

Note: triage is deliberately **recomputed server-side at submission time** rather than trusting a
client-supplied result, so a tampered client cannot force a lower urgency into the database.

## Database ER diagram (simplified)

```mermaid
erDiagram
    Patient ||--o{ AppointmentRequest : submits
    Doctor ||--o{ AppointmentRequest : "selected for"
    Doctor ||--o{ AppointmentSlot : offers
    AppointmentSlot ||--o| AppointmentRequest : "booked by"
    AppointmentRequest ||--o{ PatientAnswer : has
    AppointmentRequest ||--o| TriageAssessment : has
    AppointmentRequest ||--o{ SafetyRuleResult : has
    AppointmentRequest ||--o| ClinicianReview : has
    AppointmentRequest ||--o{ SystemAuditLog : has
    Clinician ||--o{ ClinicianReview : performs
    Clinician ||--o{ Session : "logs in via"
    EvaluationRun ||--o{ EvaluationResult : contains
```

`Question` and `SafetyRuleDefinition` are intentionally **not** database tables — they're
versioned, typed configuration data (`src/data/questions.ts`, `src/data/safetyRules.ts`) read by
the engines at request time. `PatientAnswer` stores a snapshot of the question text at the time
it was asked, so historical answers remain interpretable even if the question bank changes later.

## Directory structure

```
src/
  app/
    (site)/              patient-facing routes — home, services, doctors, about, contact, book/, request/[id]/confirmation/
    clinician/            staff routes — login, dashboard, requests/[id], evaluation
  components/
    patient/              booking-flow UI (StepIndicator, DetailsForm, ConcernForm, QuestionFlow, AssessmentResult, DoctorPicker, AppointmentPicker)
    clinician/             dashboard UI (AppShell, ReviewForm, EvaluationDashboard, LoginForm)
    triage/                shared safety/urgency display (SafetyBanner)
    common/                Button, Card, Header, Footer, UrgencyBadge, Disclaimer, DoctorAvatar, ContactForm
  lib/
    ai/                    provider interface, mock provider, Claude provider, output schema, aiService factory
    triage/                decision engine, urgency/timeframe mappings, appointment-timing guidance, doctor matching
    safety/                deterministic rule evaluator
    questions/              adaptive question-selection engine
    validation/             Zod schemas for every server action boundary
    database/               Prisma client, request/doctor/audit data access
    auth/                   password hashing, cookie session management
    evaluation/             scenario runner, metrics, confusion matrix
  data/                    doctors, questions, safetyRules, scenarios, categories, insurance (all typed config, not hardcoded in components)
  types/                   central shared TypeScript types
prisma/                    schema.prisma, migrations/, seed.ts
tests/                     Vitest suite
```

## Why this stack (not the earlier microservices build)

An earlier pass at this project (preserved in `_archive/careprior-v1/`) used 6 separate FastAPI
services, 3 separate Next.js frontends, PostgreSQL, and Docker Compose. For a solo-developer,
12-week academic prototype that needs to be demonstrated and explained in a report, that
architecture added real cost — Docker as a hard dependency to even run it, cross-service network
calls to reason about, and far more moving parts than the assessed functionality needs — without
adding assessable value. This build consolidates everything into one Next.js app with SQLite, per
the project brief's explicit stack recommendation, while carrying forward the same core ideas
(deterministic safety floor, mandatory human review, full audit trail, swappable AI provider).
