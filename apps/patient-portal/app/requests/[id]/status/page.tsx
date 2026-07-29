"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Disclaimer from "@/components/Disclaimer";
import { apiFetch, ApiError } from "@/lib/api";

type RequestDetail = {
  id: string;
  status: string;
  recommendation: { recommended_next_action?: string; additional_information_required?: boolean } | null;
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Received — awaiting staff review",
  reviewed: "Reviewed by clinic staff",
  escalated: "Escalated for clinical review",
  awaiting_information: "Clinic staff have requested more information",
};

export default function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const req = await apiFetch<RequestDetail>(`/api/v1/appointment-requests/${id}`);
      setRequest(req);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load status.");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main className="space-y-6">
      <div className="rounded-card border border-primary bg-primary-light p-6 text-center">
        <h1 className="text-xl font-bold text-primary">Request submitted</h1>
        <p className="mt-1 text-sm text-text-secondary">Thank you — your request has been received.</p>
      </div>

      {error && <p className="text-sm text-status-immediate">{error}</p>}

      {request && (
        <section className="space-y-3 rounded-card border border-border bg-bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-text-muted">Status</h2>
          <p className="text-lg font-semibold text-text-primary">{STATUS_LABELS[request.status] || request.status}</p>
          {request.recommendation?.recommended_next_action && (
            <p className="text-sm text-text-secondary">{request.recommendation.recommended_next_action}</p>
          )}
          {request.recommendation?.additional_information_required && (
            <p className="text-sm text-status-insufficient">
              Clinic staff may contact you if additional information is needed.
            </p>
          )}
        </section>
      )}

      <Disclaimer />
    </main>
  );
}
