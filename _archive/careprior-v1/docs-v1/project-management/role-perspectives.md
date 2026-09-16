# Role Perspectives — CarePrior

**Subject:** 32040 Industry Project | UTS Master of IT | Spring 2026
**Purpose:** Walks the whole platform from each user role's point of view — what they see, what they can and can't do, and why the boundary sits where it does. Useful both as a demo script and as the "different perspective routes" breakdown requested for the project write-up.

Every role is a seeded demo account (`services/api/app/seed.py`), password `CarePriorDev!23` for all, and every action taken under any role is written to the append-only audit log (`audit-service`), viewable in full by staff via **Audit Explorer**.

---

## 1. Patient — `patient@careprior.local` — `apps/patient-portal` (:3000)

**What they can do:** register/log in, grant consent, describe symptoms in free text, answer adaptive follow-up questions, pick a preferred doctor and time slot, choose insurance details, submit a request, and track its status.

**What they explicitly cannot see:** AI confidence scores, which rule (if any) fired, uncertainty internals, or staff notes — `api/app/routers/requests.py::_to_out(hide_internal=True)` strips all of that before it ever reaches the patient portal. A patient sees only: the priority category in plain language, the recommended next action, whether more information is needed, and a standing statement that human approval is mandatory. This is deliberate — a patient does not need (and should not be alarmed or falsely reassured by) an internal confidence percentage.

**Journey (mirrors the route tree 1:1 — `app/requests/[id]/…`):**

1. `login` → authenticate, receive a JWT scoped to the `patient` role.
2. `consent` → must explicitly grant consent before any request can be created (`ConsentRecord`, enforced server-side in `submit_request` — no consent, no submission, regardless of what the UI allows).
3. `requests/new` → pick a symptom category (e.g. "Cardiac / chest") and write a free-text description in their own words.
4. `requests/[id]/questions` → answer up to 9 adaptive questions, only the relevant subset (§ [ai-logic.md](../architecture/ai-logic.md) §3) — e.g. "does the discomfort extend to your arm?" only appears if chest discomfort was already reported. Each question shows *why* it's being asked.
5. `requests/[id]/doctors` → sees 3 suggested doctors, ranked by a transparent specialty-matching heuristic against their symptom category (boosted toward Cardiology if chest discomfort was reported).
6. `requests/[id]/insurance` → records insurance type/provider (soft preference, not a real billing integration).
7. `requests/[id]/time` → sees a suggested appointment slot — earliest available if the (preview) priority looks urgent, otherwise a standard-lead-time slot — and can pick a different one from the generated 5-day availability grid.
8. `requests/[id]/review` → reviews everything before final submission.
9. Submit → the real pipeline runs (rule engine + AI interpretation + precedence), a recommendation is generated and persisted, and if it's "Immediate Human Review" a notification fires to on-duty nursing staff immediately.
10. `requests/[id]/status` → tracks status (submitted → reviewed/escalated/awaiting information) without ever seeing the internal reasoning.

**Design intent:** the patient's entire experience should feel like "a form that actually listens," not like being handed a diagnosis — no follow-up question or suggestion implies a clinical conclusion; everything downstream of submission is explicitly gated on a human.

---

## 2. Reception — `reception@careprior.local` — `apps/staff-dashboard` (:3001)

**Role in the RBAC model:** `require_roles("reception", "nurse", "manager")` for the review queue and request detail; `require_roles("reception", "nurse")` for escalate/request-information actions. Reception is the front-line triage-adjacent role but cannot **accept** or **override** a clinical priority recommendation — that action is nurse-only (`require_roles("nurse")` specifically on `/accept` and `/override`), a deliberate separation of duties.

**What they can do:** view the full review queue (priority-sorted, Immediate → Priority → Manual → Insufficient → Routine, oldest-first within each bucket), open any request's full detail (including the internal reasoning, triggered rules, and AI confidence a patient never sees), escalate a request to a clinical reviewer, or request more information from the patient.

**Why this role exists as distinct from nurse:** models a real front-desk workflow — reception can triage the queue and hand off anything that needs a clinical judgement call, without being able to make that call themselves. It's the concrete enforcement of "AI-assisted, never AI-autonomous, and not every staff member is equally authorised to finalise a clinical recommendation."

---

## 3. Nurse / Clinical Reviewer — `clinician@careprior.local` — `apps/staff-dashboard` (:3001)

**This is the role the whole safety architecture is built around.** Every recommendation the system produces — regardless of category — sits in `Submitted` state until a nurse takes one of four actions:

| Action | Requires | Effect |
|---|---|---|
| **Accept** | — | Locks in the system's recommended category as final (`review_locked = True`, no further edits possible) |
| **Override** | Non-empty typed reason + a chosen final priority (both enforced server-side — `HTTPException` if missing) | Records both the original and the overridden category, locks the review |
| **Escalate** | — | Routes to a different clinical workflow state without finalising a priority |
| **Request more information** | — | Routes back toward the patient for clarification |

**What they see that a patient never does:** the full case detail (`GET /staff/requests/{id}`) — free text, every question asked and answered with its stated reason, every triggered rule with its plain-English explanation, the AI's extracted symptoms/confidence/contradictions, and the full prior review history if any.

**Why override requires a typed reason:** this is the audit trail's most important row type — it's the evidence that a human, not the system, is accountable for every final clinical prioritisation, and it's the exact data point a future evaluation module would use to measure "how often did staff disagree with the AI, and about what."

---

## 4. Practice Manager — `manager@careprior.local` — `apps/staff-dashboard` (:3001)

Shares reception/nurse's read access to the review queue and request detail (`require_roles("reception", "nurse", "manager")`) but is intended as the oversight role: reviewing queue health, staff review patterns (accept vs. override rates), and audit completeness — the role that would consume the analytics screens being built out in Week 5 of the [milestone planner](milestone-planner.md), rather than acting on individual cases day-to-day.

---

## 5. System Administrator — `admin@careprior.local`

Owns configuration surfaces outside the clinical workflow entirely: user accounts, and — as the rule/model/prompt admin screens land (Week 5 of the planner) — the versioned rule set and AI provider configuration. Deliberately has **no path** to accept/override a clinical recommendation; administrative and clinical authority are kept separate on purpose, mirroring real health-system governance (an IT admin managing accounts is not thereby a clinical decision-maker).

---

## 6. Research Evaluator — `researcher@careprior.local`

The role the brief's four-mode comparative-evaluation feature (Static-form / Rule-only / AI-only / Hybrid) is being built for (`research-console`, [milestone planner](milestone-planner.md) Weeks 6–7) — read/analysis access to the synthetic scenario library, evaluation run results, and metrics dashboards, with no access to real patient-workflow actions at all. This role exists specifically to support the academic research questions in README §9 (does hybrid outperform static/rule-only/AI-only? does adaptive questioning improve prioritisation over a static form? how does the system behave under incomplete/ambiguous/contradictory input?) — it's a first-class product surface, not just an internal test harness, per discovery doc §3 assumption 10.

---

## 7. One flow, four roles, one audit trail — the demo narrative

The clearest way to show this system's actual contribution in a live demo is to run **one** case through all four roles in sequence and show the same event trail from every angle:

1. **Patient** submits "I have been feeling tired and slightly short of breath," then confirms chest discomfort + sweating + arm radiation during adaptive questioning → sees only "your request needs prompt attention, a staff member will review it."
2. **Reception/Nurse** opens the review queue → sees the same request at the top, tagged `Immediate Human Review`, with `RULE-CARDIAC-001` shown verbatim ("Chest discomfort combined with sweating/arm radiation is a prototype warning cluster requiring immediate human review") plus the AI's independent read of the free text.
3. **Nurse** accepts (or overrides with a typed reason) — the decision locks.
4. **Any staff role** opens **Audit Explorer** and sees the complete, ordered, append-only trail: request created → AI interpretation run → prioritisation generated → notification sent → staff review recorded — with no gaps and no row that can be edited or deleted after the fact.

This sequence is the single strongest piece of evidence for the project's core methodological claim: prioritisation is AI-assisted and rule-guarded, but never AI-decided, and every step is explainable and auditable after the fact.
