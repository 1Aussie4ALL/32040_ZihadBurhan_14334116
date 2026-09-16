# Technology Stack — CarePrior

**Subject:** 32040 Industry Project | UTS Master of IT | Spring 2026
**Scope:** Justifies every technology choice actually used in this build (not an aspirational list). Each row exists because of a specific requirement in the brief or a specific trade-off recorded in [phase-1-discovery.md](../project-management/phase-1-discovery.md).

---

## 1. Stack at a glance

| Layer | Technology | Version (pinned) |
|---|---|---|
| Frontend framework | Next.js (App Router, TypeScript) | 15.3.x, React 18.3 |
| Styling | Tailwind CSS | 3.4.x |
| Backend framework | FastAPI (Python, async) | 0.115.x |
| ASGI server | Uvicorn | 0.30.x |
| ORM | SQLAlchemy 2.0 (declarative) | 2.0.35 |
| Database | PostgreSQL | 16 (Alpine image) |
| DB driver | psycopg2-binary | 2.9.9 |
| Validation / DTOs | Pydantic v2 + pydantic-settings | 2.9.x |
| Auth | PyJWT (HS256) + Passlib/bcrypt | 2.9.x / 1.7.4 |
| Inter-service HTTP | httpx (async client) | 0.27.x |
| Containerisation | Docker + Docker Compose v2 | — |
| Diagramming (docs) | Mermaid (embedded in Markdown) | — |

Nothing here is exotic. The brief's biggest risk (§ R-01 in the discovery doc) is topology size — nine deployable units for a solo build — not technology novelty, so every individual choice below optimises for **boring, well-documented, fast-to-implement-correctly**, and the innovation budget is spent entirely on the prioritisation logic (§4 below and [ai-logic.md](ai-logic.md)), not on the plumbing.

---

## 2. Why this stack, not the alternatives

### 2.1 FastAPI over Django / Node-Express / Spring Boot

- **Async-native**: every service in this system calls at least one other service over HTTP as part of a request (`api` → `rule-engine` + `ai-service` via `prioritisation-service`, chained 3 deep on the submit path). FastAPI's native `async def` + `httpx.AsyncClient` means those calls don't block a worker thread — important once six services are running concurrently on one dev machine.
- **Pydantic-first**: request/response schemas are defined once and get automatic validation, OpenAPI docs (`/docs` on every service), and (via `services/shared/careprior_shared/schemas.py`) can be shared as the single source of truth for the shapes that cross service boundaries — e.g. `PrioritisationRecommendation` and `RuleTriggerOut` are imported by both `prioritisation-service` and `api`, so the contract can't silently drift.
- **Lightweight per-service footprint**: with 6 backend services, a heavier framework (Django's ORM/admin/migrations machinery, full Spring Boot) would multiply boilerplate six times over. FastAPI + a ~150-line shared library (§3) was the deliberate alternative to that.
- Chosen over Node/Express to keep one language (Python) across all backend services and share one dependency-pinning discipline, and because SQLAlchemy's declarative models made the "each service owns its own tables in a shared Postgres instance" schema-per-service pattern (§2.3) straightforward.

### 2.2 Next.js (App Router) over plain React / Vue / a static site generator

- Three separate frontends (`hospital-website`, `patient-portal`, `staff-dashboard`) needed to ship fast with server-side rendering for the public marketing site (SEO, fast first paint — nobody needs a JS bundle to read "Our Doctors") and client interactivity for the two authenticated apps (adaptive question flow, review queue).
- App Router file-based routing maps 1:1 onto the brief's screen list (`app/requests/[id]/questions/page.tsx`, `.../doctors/page.tsx`, `.../time/page.tsx`, `.../insurance/page.tsx`, `.../review/page.tsx`, `.../status/page.tsx` for the patient-portal booking wizard) — the route tree *is* the flow diagram, which matters for a project graded partly on demonstrable process.
- One React version (18.3) pinned across all three apps avoids the classic monorepo drift problem without needing a full Turborepo/Nx setup, which would be over-engineering for three apps of this size.

### 2.3 PostgreSQL, single instance, schema-per-service

- **Single instance** (not one database per service) was an explicit scope decision (discovery doc §3, assumption 5): separate databases per service is real operational overhead (connection pools, backup/restore, cross-service joins for reporting) with no real payoff for a prototype that will never need independent scaling.
- **Schema-per-service** (`api`, `rules`, `audit`, `notification` schemas in one `careprior` database) still gives each service exclusive ownership of its own tables — no service reaches into another's tables directly, preserving the service-boundary discipline of the "full split" architecture without paying for physically separate databases.
- Postgres specifically (over MySQL/SQLite) for native `JSONB` columns — used extensively for `facts`, `recommendation`, and `answer_value` fields where the shape is semi-structured (varies by symptom category / question type) and querying inside it isn't a hot path for this prototype.
- `Base.metadata.create_all()` on service startup instead of Alembic migrations — a deliberate, documented scope reduction (README §7): correct for a prototype with no existing production data to migrate safely, wrong for anything beyond it. This is flagged, not hidden, in every doc that discusses it.

### 2.4 JWT (PyJWT, HS256, shared secret) over session cookies / OAuth provider

- Six backend services need to verify "who is this request from and what role are they" without each one owning a login flow. Centralising issuance in `api` (discovery doc §3) and having every other service verify the same signed token via one shared `services/shared/careprior_shared/auth_dep.py` dependency means the RBAC check (`require_roles("nurse")`, `require_roles("reception", "nurse", "manager")`, etc.) is a single reusable FastAPI dependency, not six reimplementations.
- HS256 with a shared secret (not RS256/JWKS) is the right complexity level for one deployable trust boundary (one docker-compose network) — RS256 buys you independent key rotation across genuinely separate trust domains, which doesn't exist here.
- Full OAuth/OIDC (Auth0, Cognito, Keycloak) was considered and rejected: it adds an external dependency and infrastructure surface for a capability (federated third-party login) nothing in the brief requires. Passlib+bcrypt password hashing covers the actual requirement (secure local credential storage for 6 demo accounts).

### 2.5 Mock AI provider behind an `AIProvider` interface, not a live LLM call by default

This is the single most consequential engineering decision in the stack and gets its own document: [ai-logic.md](ai-logic.md). Summary: `services/ai-service/app/providers/base.py` defines the interface; `mock_provider.py` implements it with deterministic keyword/pattern extraction; `factory.py` selects the provider from `AI_PROVIDER` env var. A real Anthropic-compatible adapter can be added later against the exact same interface with zero changes to `prioritisation-service` or `api` domain logic. Mock-by-default was chosen for:
- **Zero API cost** across a semester of iterative development and demoing.
- **Full determinism**, which is a hard requirement for the planned research-evaluation module (comparing Static/Rule-only/AI-only/Hybrid modes needs repeatable AI outputs for the same input, which a temperature>0 LLM call cannot guarantee run-to-run).
- **No external network dependency** during marking/demo — the whole stack runs fully offline once images are built.

### 2.6 Docker Compose over Kubernetes / bare processes

- Nine deployable units is already the ceiling of what's reasonable to run by hand (`uvicorn` × 6 + `next dev` × 3 in separate terminals). Compose gives one-command bring-up (`docker compose up --build`), consistent networking (service DNS names like `http://rule-engine:8000` resolve automatically), and per-service health checks (`postgres` has a real `pg_isready` healthcheck other services `depends_on`).
- Kubernetes was explicitly out of scope: no requirement for autoscaling, rolling deploys, or multi-node scheduling exists for a local academic demo; it would add YAML volume without adding grade-relevant capability.

---

## 3. The shared library (`services/shared/careprior_shared`)

A ~150-line internal Python package vendored into every backend service's Docker image (not published to PyPI — copied via each `Dockerfile`). Exists purely to avoid six-way duplication of code that has to behave *identically* everywhere for the security/audit model to hold:

| Module | Responsibility |
|---|---|
| `jwt_utils.py` | Encode/decode JWTs against `JWT_SECRET` |
| `auth_dep.py` | `require_roles(...)` FastAPI dependency — the single RBAC gate every protected route uses |
| `roles.py` | The canonical role enum (`patient`, `reception`, `nurse`, `manager`, `admin`, `researcher`) |
| `schemas.py` | Cross-service Pydantic contracts (`PrioritisationRecommendation`, `RuleTriggerOut`, `PRECEDENCE_ORDER`) so `prioritisation-service` and `api` can't drift on the shape of a recommendation |
| `audit_client.py` | `record_audit_event(...)` — the only way any service writes to the append-only audit log; guarantees every service logs events in the same shape |
| `logging_config.py` | Structured logging setup, consistent across services |

This is the one "premature abstraction" the project deliberately allows, because the duplication cost (JWT verification logic re-implemented six times, silently drifting) is a real, immediate correctness risk to the RBAC/audit model — not a hypothetical future one.

---

## 4. Where the actual innovation lives (not in the stack)

It's worth being explicit for grading purposes: none of the technology choices above are novel. The project's contribution is the **domain logic layered on top of boring infrastructure** — the precedence model between deterministic rules and AI interpretation, the adaptive question branching, and the mandatory-human-review workflow. See [ai-logic.md](ai-logic.md) for that logic in full, and [literature-review.md](../research/literature-review.md) for how it sits against existing booking/triage systems.

---

## 5. Local ports (dev)

| Service | Port |
|---|---|
| `patient-portal` | 3000 |
| `staff-dashboard` | 3001 |
| `hospital-website` | 3002 |
| `api` (Swagger at `/docs`) | 8000 |
| `audit-service` | 8001 |
| `rule-engine` | 8002 |
| `ai-service` | 8003 |
| `prioritisation-service` | 8004 |
| `notification-service` | 8005 |
| `postgres` | 5432 |
