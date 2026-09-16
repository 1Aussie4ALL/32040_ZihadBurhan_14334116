# Limitations

This section exists so nobody — including us — overstates what this prototype demonstrates.

## Academic / clinical limitations

- **The 26 synthetic patient scenarios are not clinical validation.** They were authored to
  exercise the system's logic paths (each safety rule, each urgency band, contradictory/vague
  input), not sampled from real patient presentations or reviewed by a clinician for realism.
- **The 19 deterministic safety rules are a documented prototype framework, not a complete
  clinical triage protocol.** Real triage systems (e.g. ATS, MTS, ESI) are the product of years of
  clinical consensus and validation; this rule set covers illustrative categories from the project
  brief only.
- **No real-world patient testing has occurred.** Every patient, doctor, and appointment in this
  system is synthetic.
- **AI classification may contain errors.** The mock provider is a deterministic heuristic
  standing in for a language model; a real model (Claude or otherwise) can misclassify, and its
  output is one input among several — never the sole basis for a decision.
- **Model/heuristic confidence is not clinical certainty.** Confidence here reflects how much
  structured information was available, not how "sure" the system is that its assessment is
  medically correct. The UI states this explicitly wherever confidence is shown.
- **Clinician oversight remains necessary.** Every single request, regardless of urgency,
  requires human review (`requiresHumanReview` is always `true` and cannot be turned off) —
  the system is designed to support, not replace, that judgement.

## Engineering simplifications (deliberate, documented, not oversights)

- **No patient accounts or consent-capture flow.** The brief explicitly asks for booking "without
  needing a complicated account"; a production system would need real identity and consent
  handling (see [`privacy-security.md`](privacy-security.md)).
- **Triage is recomputed twice per booking** (once at the Assessment step, once at submission) to
  avoid trusting a client-supplied result. With a real (non-deterministic) AI provider this could
  occasionally give a slightly different phrasing/confidence between the two calls, though the
  safety-rule floor is identical both times since it depends only on submitted answers. A
  production system would likely cache the first result in a short-lived signed token instead of
  recomputing, to save the extra API call.
- **Appointment slots are generated once by the seed script** for the next 10 days from whenever
  it was last run, not continuously regenerated in the background. Re-run `npm run db:seed` to
  refresh availability if the demo environment has been sitting for a while.
- **No server-side session revocation list / rate limiting** on the clinician login — acceptable
  for a local demo, not for production (see [`privacy-security.md`](privacy-security.md)).
- **Risk indicators fed to the AI are derived from which safety rules fired**, not from a
  free-standing NLP pass over the concern text — this keeps the two layers consistent but means a
  concern described only in free text, with no matching structured answer, won't surface as a
  "risk indicator" per se (it can still influence the AI's own reasoning via `primaryConcern`).
- **The insurance/cost step is entirely simulated** (section 17 of the brief) — no real Medicare
  or private-insurer integration exists, and figures shown are illustrative demo pricing.
- **Speech-to-text and nearby-alternative-care are out of scope for this build** (brief sections
  18–19, explicitly stretch/future features) — not implemented, to avoid spending time on
  low-academic-value polish ahead of the core safety/triage/evaluation requirements.
- **Single clinic, single location.** All doctors are seeded at the same fictional address; there
  is no multi-site or geolocation logic.

## Production deployment would additionally require

- Clinical governance sign-off on any real rule set or AI configuration.
- A formal security and privacy review (see [`privacy-security.md`](privacy-security.md) for the
  specific gaps).
- Depending on jurisdiction, a regulatory/therapeutic-goods assessment before triage output could
  inform real clinical prioritisation.
- Real-world piloting and outcome evaluation — this prototype's "accuracy" is only ever measured
  against its own synthetic scenarios, never against real clinical outcomes.

## Do not

- Do not enter real patient information into this prototype.
- Do not treat any output of this system as a diagnosis or medical advice.
- Do not rely on this system in a real emergency — call **000**.
