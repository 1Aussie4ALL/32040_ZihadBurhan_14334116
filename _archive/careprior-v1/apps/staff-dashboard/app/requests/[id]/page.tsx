"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import StatusChip from "@/components/StatusChip";
import { apiFetch, ApiError, getRole } from "@/lib/api";

type RuleTrigger = {
  rule_id: string;
  rule_name: string;
  severity: string;
  category: string;
  explanation: string;
  matched_answer: string;
};

type Recommendation = {
  recommended_priority: string;
  reasoning_summary: string;
  contributing_factors: string[];
  triggered_rules: RuleTrigger[];
  missing_information: string[];
  uncertainty_level: string;
  recommended_next_action: string;
  requires_immediate_acknowledgement: boolean;
  additional_information_required: boolean;
  human_approval_mandatory: boolean;
  system_version: string;
  generated_at: string;
};

type QuestionHistoryItem = {
  question_key: string;
  question_text: string;
  reason_for_asking: string;
  answer_value: unknown;
  asked_at: string;
  answered_at: string | null;
};

type Review = {
  id: string;
  reviewer_id: string;
  decision: string;
  original_priority: string;
  final_priority: string;
  override_reason: string | null;
  notes: string | null;
  created_at: string;
};

type RequestDetail = {
  id: string;
  symptom_category: string;
  free_text: string;
  facts: Record<string, unknown>;
  status: string;
  recommendation: Recommendation | null;
  review_locked: boolean;
  question_history: QuestionHistoryItem[];
  reviews: Review[];
  preferred_doctor: string | null;
  preferred_time: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  patient_name: string | null;
  patient_email: string | null;
  patient_phone: string | null;
};

const INSURANCE_LABELS: Record<string, string> = {
  medicare: "Medicare",
  private: "Private health insurance",
  self_funded: "Self-funded / no cover",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const PRIORITY_OPTIONS = [
  "Immediate Human Review",
  "Priority Review",
  "Manual Review Required",
  "Insufficient Information",
  "Routine Review",
];

export default function RequestDetailPage() {
  return (
    <AppShell allowedRoles={["reception", "nurse", "manager"]}>
      <RequestDetailContent />
    </AppShell>
  );
}

function RequestDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = getRole();
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"override" | "escalate" | "request-info" | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [finalPriority, setFinalPriority] = useState(PRIORITY_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<RequestDetail>(`/api/v1/staff/requests/${id}`);
      setDetail(data);
      if (data.recommendation) setFinalPriority(data.recommendation.recommended_priority);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load this request.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(path: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/staff/requests/${id}/${path}`, { method: "POST", body: JSON.stringify(body) });
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return <p className="text-text-secondary">{error || "Loading…"}</p>;
  }

  const rec = detail.recommendation;
  const canDecide = role === "nurse" && !detail.review_locked;
  const canEscalateOrInfo = (role === "nurse" || role === "reception") && !detail.review_locked;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/dashboard")} className="focus-ring text-sm text-primary hover:underline">
        ← Back to queue
      </button>

      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Request {detail.id.slice(0, 8)}</h1>
        {rec && <StatusChip category={rec.recommended_priority} />}
      </div>

      {rec && rec.recommended_priority === "Immediate Human Review" && !detail.review_locked && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-4 py-3 text-sm text-status-immediate">
          <p className="font-semibold">This request needs immediate attention.</p>
          <p className="mt-1">
            Consider calling the patient directly to bring their appointment forward, or advise them to attend
            Emergency (or call 000) if their condition appears to be worsening. This is a prototype recommendation —
            use clinical judgement.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          <Panel title="Patient details">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Name</p>
                <p className="text-text-primary">{detail.patient_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Email</p>
                <p className="text-text-primary">{detail.patient_email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Phone</p>
                <p className="text-text-primary">{detail.patient_phone || "—"}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Patient-submitted information">
            <p className="text-sm text-text-muted">Category</p>
            <p className="mb-3 text-text-primary">{detail.symptom_category}</p>
            <p className="text-sm text-text-muted">Free-text description</p>
            <p className="text-text-primary">{detail.free_text}</p>
          </Panel>

          <Panel title="Booking details">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Doctor</p>
                <p className="text-text-primary">{detail.preferred_doctor || "No preference"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Time</p>
                <p className="text-text-primary">{formatDateTime(detail.preferred_time)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">Cover</p>
                <p className="text-text-primary">
                  {detail.insurance_type ? INSURANCE_LABELS[detail.insurance_type] || detail.insurance_type : "—"}
                  {detail.insurance_provider && ` (${detail.insurance_provider})`}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Question and answer history">
            <ul className="space-y-3">
              {detail.question_history.map((q, i) => (
                <li key={i} className="border-b border-border pb-2 text-sm last:border-0">
                  <p className="text-text-primary">{q.question_text}</p>
                  <p className="text-text-secondary">Answer: {String(q.answer_value)}</p>
                  <p className="text-xs text-text-muted">Reason asked: {q.reason_for_asking}</p>
                </li>
              ))}
              {detail.question_history.length === 0 && <p className="text-sm text-text-muted">No follow-up questions were needed.</p>}
            </ul>
          </Panel>

          <Panel title="Consent status">
            <p className="text-sm text-text-secondary">Consent recorded prior to submission (required before a request can be submitted).</p>
          </Panel>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          <Panel title="Recommendation and explanation">
            {rec ? (
              <div className="space-y-3 text-sm">
                <p className="text-text-primary">{rec.reasoning_summary}</p>
                <div>
                  <p className="text-xs font-semibold uppercase text-text-muted">Contributing factors</p>
                  <ul className="list-inside list-disc text-text-secondary">
                    {rec.contributing_factors.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-text-muted">Uncertainty</p>
                  <p className="capitalize text-text-secondary">{rec.uncertainty_level}</p>
                </div>
                {rec.missing_information.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-text-muted">Missing information</p>
                    <p className="text-text-secondary">{rec.missing_information.join(", ")}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase text-text-muted">Recommended next action</p>
                  <p className="text-text-secondary">{rec.recommended_next_action}</p>
                </div>
                <p className="rounded-input bg-bg-secondary px-2 py-1 text-xs text-text-muted">
                  Human approval is mandatory. System version {rec.system_version}.
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">No recommendation yet.</p>
            )}
          </Panel>

          <Panel title="Triggered prototype safety rules">
            {rec && rec.triggered_rules.length > 0 ? (
              <ul className="space-y-3 text-sm">
                {rec.triggered_rules.map((t) => (
                  <li key={t.rule_id} className="rounded-input border border-border p-3">
                    <p className="font-medium text-text-primary">{t.rule_name} <span className="text-xs text-text-muted">({t.severity})</span></p>
                    <p className="text-text-secondary">{t.explanation}</p>
                    <p className="text-xs text-text-muted">Matched: {t.matched_answer}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">No deterministic prototype rules triggered for this request.</p>
            )}
          </Panel>

          <Panel title="Review decisions">
            {detail.reviews.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {detail.reviews.map((rv) => (
                  <li key={rv.id} className="border-b border-border pb-2 last:border-0">
                    <p className="text-text-primary capitalize">{rv.decision.replace("_", " ")} by {rv.reviewer_id.slice(0, 8)}</p>
                    <p className="text-text-secondary">{rv.original_priority} → {rv.final_priority}</p>
                    {rv.override_reason && <p className="text-xs text-text-muted">Reason: {rv.override_reason}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">No review actions recorded yet.</p>
            )}
          </Panel>

          {!detail.review_locked && (
            <div className="flex flex-wrap gap-2">
              {canDecide && (
                <Button disabled={busy} onClick={() => act("accept", { notes })}>Accept recommendation</Button>
              )}
              {canDecide && (
                <Button variant="secondary" disabled={busy} onClick={() => setModal("override")}>Override</Button>
              )}
              {canEscalateOrInfo && (
                <Button variant="secondary" disabled={busy} onClick={() => setModal("escalate")}>Escalate</Button>
              )}
              {canEscalateOrInfo && (
                <Button variant="secondary" disabled={busy} onClick={() => setModal("request-info")}>Request more information</Button>
              )}
            </div>
          )}
          {detail.review_locked && (
            <p className="text-sm font-medium text-status-routine">This review has been finalised and is locked.</p>
          )}
        </div>
      </div>

      {modal === "override" && (
        <Modal title="Override recommendation" onClose={() => setModal(null)}>
          <label className="block text-sm font-medium text-text-primary">Final priority</label>
          <select value={finalPriority} onChange={(e) => setFinalPriority(e.target.value)} className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm">
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <label className="mt-3 block text-sm font-medium text-text-primary">Override reason (required)</label>
          <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={3} className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button disabled={busy || !overrideReason.trim()} onClick={() => act("override", { final_priority: finalPriority, override_reason: overrideReason, notes })}>
              Confirm override
            </Button>
          </div>
        </Modal>
      )}

      {modal === "escalate" && (
        <Modal title="Escalate request" onClose={() => setModal(null)}>
          <label className="block text-sm font-medium text-text-primary">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => act("escalate", { notes })}>Confirm escalation</Button>
          </div>
        </Modal>
      )}

      {modal === "request-info" && (
        <Modal title="Request additional information" onClose={() => setModal(null)}>
          <label className="block text-sm font-medium text-text-primary">What's needed (optional notes)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => act("request-information", { notes })}>Confirm request</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-bg-surface p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-card bg-bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="focus-ring text-text-muted" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
