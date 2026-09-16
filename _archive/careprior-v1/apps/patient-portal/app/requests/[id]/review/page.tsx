"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";

type RequestDetail = {
  id: string;
  symptom_category: string;
  free_text: string;
  facts: Record<string, unknown>;
  status: string;
  preferred_doctor: string | null;
  preferred_time: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
};

const INSURANCE_LABELS: Record<string, string> = {
  medicare: "Medicare",
  private: "Private health insurance",
  self_funded: "Self-funded / no cover",
};

type HistoryItem = {
  question_text: string;
  answer_value: unknown;
  reason_for_asking: string;
};

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [req, hist] = await Promise.all([
          apiFetch<RequestDetail>(`/api/v1/appointment-requests/${id}`),
          apiFetch<HistoryItem[]>(`/api/v1/appointment-requests/${id}/question-history`),
        ]);
        setRequest(req);
        setHistory(hist);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load your request.");
      }
    })();
  }, [id]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/appointment-requests/${id}/submit`, { method: "POST" });
      router.push(`/requests/${id}/status`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!request) {
    return <main><p className="text-text-secondary">{error || "Loading…"}</p></main>;
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Review your answers</h1>
      <p className="text-sm text-text-secondary">Please check this is accurate before submitting to clinic staff.</p>

      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}

      <section className="space-y-3 rounded-card border border-border bg-bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-text-muted">Category</h2>
          <p className="text-text-primary">{request.symptom_category}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-muted">Your description</h2>
          <p className="text-text-primary">{request.free_text}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-card border border-border bg-bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-text-muted">Your booking</h2>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-text-muted">Doctor</p>
            <p className="text-text-primary">{request.preferred_doctor || "No preference"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-text-muted">Time</p>
            <p className="text-text-primary">
              {request.preferred_time
                ? new Date(request.preferred_time).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
                : "Not chosen"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-text-muted">Cover</p>
            <p className="text-text-primary">
              {request.insurance_type ? INSURANCE_LABELS[request.insurance_type] || request.insurance_type : "Not provided"}
              {request.insurance_provider && ` (${request.insurance_provider})`}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-card border border-border bg-bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-text-muted">Follow-up answers</h2>
        <ul className="space-y-2 text-sm">
          {history.map((h, i) => (
            <li key={i} className="border-b border-border pb-2 last:border-0">
              <p className="text-text-primary">{h.question_text}</p>
              <p className="text-text-secondary">Answer: {String(h.answer_value)}</p>
            </li>
          ))}
        </ul>
      </section>

      <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</Button>
    </main>
  );
}
