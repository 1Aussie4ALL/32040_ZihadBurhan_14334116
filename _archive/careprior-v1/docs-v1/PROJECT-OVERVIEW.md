# CarePrior — Full Project Overview & Execution Rundown

**Subject:** 32040 Industry Project | UTS Master of IT | Spring 2026 | Solo developer: Zihad Burhan
**Academic project title:** Design and Evaluation of an Explainable, Human-Supervised AI Clinical Intake and Prioritisation Platform for Primary Healthcare
**Working demo hospital:** Hamilton's Hospital (fictional, synthetic data only)
**Status at time of writing:** Live. The full 10-container stack (6 backend services + 3 frontends + Postgres) is built and running under Docker on this machine right now, and the brief's case-study scenario has been exercised end-to-end against the real running system, not just unit-tested — see §6.

This document is the single entry point into everything else. Read this first; follow the links for depth.

---

## 1. What problem this solves, in one paragraph

Primary-care appointment requests arrive as vague, incomplete, or inconsistent free text, reviewed by staff with limited time and variable clinical training, against static forms that ask the same fixed fields of everyone regardless of relevance. CarePrior asks whether a system that combines (a) adaptive follow-up questioning, (b) an AI interpretation layer, and (c) deterministic, never-overridable safety rules — with (d) mandatory human review and (e) a full audit trail — can flag requests needing earlier attention more consistently than a static form, while remaining fully explainable and never diagnosing, prescribing, or acting autonomously. See [docs/research/literature-review.md](research/literature-review.md) for the existing-systems research this responds to, and §3 below for exactly what's novel.

---

## 2. Document map

| Document | Answers |
|---|---|
| [phase-1-discovery.md](project-management/phase-1-discovery.md) | Original architecture decisions, assumptions, risk register |
| [milestone-planner.md](project-management/milestone-planner.md) | 12-week schedule (27 Jul–18 Oct), what's done, what's next, buffer |
| [role-perspectives.md](project-management/role-perspectives.md) | The system from patient / reception / nurse / manager / admin / researcher viewpoints |
| [tech-stack.md](architecture/tech-stack.md) | Every technology choice and why, not just what |
| [ai-logic.md](architecture/ai-logic.md) | Exactly how the AI, rules, and precedence model work — the core methodology document |
| [literature-review.md](research/literature-review.md) | Existing booking/triage systems, the gap in the literature, how this project targets it |
| [README.md](../README.md) | Run instructions, demo script, current scope/limitations |

---

## 3. What's actually innovative here (the one-paragraph pitch)

Most patient-facing booking systems (Zocdoc-style consumer tools, NHS e-RS, practice-management portals) are pure scheduling with no clinical reasoning. Most AI symptom checkers either overreach into diagnosis (a real safety/liability problem) or run as a standalone black box with no deterministic safety floor and no audit trail. CarePrior's contribution is the **combination**, specifically the precedence architecture: a deterministic rule engine that can never be silently downgraded by an AI signal; an AI layer that fails safe (outage or low confidence routes to mandatory manual review, never silently to "routine"); adaptive questioning that only asks what's relevant instead of a fixed form; and a mandatory human-review gate on literally every single case, with a complete append-only audit trail from submission to final decision. Full detail: [ai-logic.md](architecture/ai-logic.md) §1 and §8; literature grounding: [literature-review.md](research/literature-review.md) §6.

---

## 4. Tech stack, one line each

- **Frontend:** 3× Next.js/TypeScript/Tailwind apps — `hospital-website` (public marketing site, Hamilton's Hospital), `patient-portal`, `staff-dashboard`.
- **Backend:** 6× independent FastAPI services — `api` (auth/RBAC + orchestration), `ai-service` (swappable AI provider, mock by default), `rule-engine` (deterministic rules), `prioritisation-service` (combination + precedence), `audit-service` (append-only log), `notification-service` (in-app alerts).
- **Data:** single PostgreSQL 16 instance, schema-per-service.
- **Auth:** centralised JWT issuance in `api`, verified everywhere via a shared internal Python library.
- **Orchestration:** Docker Compose, 10 containers total.

Full rationale for every choice: [tech-stack.md](architecture/tech-stack.md).

---

## 5. The AI logic, one paragraph

A mock (deterministic, zero-cost, fully reproducible) AI provider extracts symptoms/severity/onset/duration/confidence/contradictions from free text behind a swappable `AIProvider` interface. An adaptive questioning engine asks up to 9 questions from a fixed library, branching on prior answers (e.g. arm-radiation is only asked if chest discomfort was reported), each with an auditable "why this was asked." A deterministic rule engine (8 seeded rules, expanding per the milestone plan) evaluates only patient-*confirmed* structured answers — never raw AI inference — against IF/AND/OR conditions, including the brief's exact cardiac-warning cluster (chest discomfort + sweating/arm radiation → Immediate Human Review). A precedence function combines both signals: the AI can raise urgency but never lower a triggered rule's category, and AI failure or low confidence always routes to Manual Review Required, never silently to Routine. Every recommendation, regardless of category, requires a nurse to accept or override (mandatory typed reason) before it's final. Full detail, including the exact rule table and the code paths: [ai-logic.md](architecture/ai-logic.md).

---

## 6. What was verified live today (10 Aug 2026), not just claimed

Earlier builds of this project were validated only through portable, non-Docker toolchains (see README §6) because Docker wasn't available in that build environment. Today, with Docker available on this machine:

1. Docker Desktop's engine was started and `docker compose up --build` was run for real — **all 10 containers** (postgres, 6 backend services, 3 frontends) came up healthy.
2. All four web endpoints returned HTTP 200: `patient-portal` (:3000), `staff-dashboard` (:3001), `hospital-website` (:3002), `api` Swagger docs (:8000/docs).
3. A real login against the running `api` container succeeded and returned a valid JWT.
4. The **entire brief case-study scenario** was executed against the live stack via the real HTTP API — not a unit test: patient login → consent → create request ("I have been feeling tired and slightly short of breath") → adaptive questioning answered to disclose chest discomfort + sweating + arm radiation → submit → the live pipeline (real network calls between `api`, `prioritisation-service`, `rule-engine`, `ai-service`) correctly returned **`Immediate Human Review`** → clinician login → the request appeared correctly bucketed at the top of the priority-sorted staff review queue.
5. The rebranded `hospital-website` was fetched live and confirmed to render "Hamilton's Hospital" branding throughout (title, header, footer, about/contact copy, address) — the rename from the placeholder "Willowbrook General Hospital" is complete and live, not just committed to source.

This is meaningfully stronger evidence than the earlier "import-checked, DDL-compiled, network-mocked" validation described in README §6 — it's the actual system, actually running, actually producing the correct clinical-prioritisation outcome end-to-end.

---

## 7. How to run the live demo right now

```bash
cd 32040_ZihadBurhan_14334116
docker compose ps          # confirm all 10 containers are Up
```

Then open:

| App | URL |
|---|---|
| Hospital website (start here) | http://localhost:3002 |
| Patient portal | http://localhost:3000 |
| Staff dashboard | http://localhost:3001 |
| API docs (Swagger) | http://localhost:8000/docs |

**Demo accounts** (password for all: `CarePriorDev!23`): `patient@careprior.local`, `reception@careprior.local`, `clinician@careprior.local`, `manager@careprior.local`, `admin@careprior.local`, `researcher@careprior.local`.

**Recommended walkthrough** (also in README §5, and narrated per-role in [role-perspectives.md](project-management/role-perspectives.md) §7): start at the Hamilton's Hospital homepage → "Request an Appointment" → log in as `patient@careprior.local` → grant consent → create a request, category "Cardiac / chest", description *"I have been feeling tired and slightly short of breath"* → answer the adaptive questions, reporting chest discomfort = yes, sweating = yes, arm radiation = yes → pick a doctor/time/insurance → submit → log in to the staff dashboard as `clinician@careprior.local` → the request is at the top of the queue tagged **Immediate Human Review** with the full rule/AI reasoning visible → accept or override → open **Audit Explorer** to see the complete append-only trail.

If you `docker compose down` and want to restart later, `docker compose up -d` (no `--build` needed unless source changed) brings it back up in seconds, since images are already built.

---

## 8. Where the project stands vs. the 12-week plan

Per [milestone-planner.md](project-management/milestone-planner.md): **Weeks 1–3 are complete**, roughly 2–3 weeks ahead of a conservative pace — the full vertical slice was working by day 2, and today's session added the research/strategy documentation layer plus the first fully-live (not just logic-tested) Docker validation. Weeks 4–11 are horizontal-fill and hardening (rule/question breadth, remaining screens, the `research-console` evaluation app, the 30-scenario synthetic library, security hardening, test coverage, accessibility). 12–14 Oct is feature freeze; 15–18 Oct is reserved exclusively for stress testing and report writing — no new features in that window, by design.

---

## 9. Known, deliberate limitations (not oversights)

Carried from README §7 and the discovery doc: no `research-console` yet (Week 6–7 item); `create_all()` instead of Alembic migrations (Week 9 item); single `role` column instead of full RBAC tables (Week 9 item); 8 rules / 9-question library rather than the full target breadth (Week 4 item); no server-side JWT revocation (Week 9 item). Every one of these has an owning week in the milestone planner — none is being silently carried indefinitely.

---

## 10. Disclaimer (repeated deliberately — it matters)

This is an academic research prototype. It is not a medical device, has not been clinically validated, and must never be used for real patient triage, diagnosis, or emergency decision-making. All data is synthetic. In a real emergency in Australia, call **Triple Zero (000)**.
