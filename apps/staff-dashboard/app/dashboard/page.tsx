"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusChip from "@/components/StatusChip";
import Disclaimer from "@/components/Disclaimer";
import { apiFetch, ApiError } from "@/lib/api";

type QueueItem = {
  id: string;
  symptom_category: string;
  recommended_priority: string | null;
  uncertainty_level: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
  assigned_staff_id: string | null;
};

function waitingMinutes(submittedAt: string | null): number | null {
  if (!submittedAt) return null;
  return Math.round((Date.now() - new Date(submittedAt).getTime()) / 60000);
}

export default function DashboardPage() {
  return (
    <AppShell allowedRoles={["reception", "nurse", "manager"]}>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  async function load() {
    try {
      const params = priorityFilter ? `?priority=${encodeURIComponent(priorityFilter)}` : "";
      const data = await apiFetch<QueueItem[]>(`/api/v1/staff/review-queue${params}`);
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load the review queue.");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityFilter]);

  const waiting = items.filter((i) => i.status === "submitted").length;
  const immediate = items.filter((i) => i.recommended_priority === "Immediate Human Review" && i.status === "submitted").length;
  const priority = items.filter((i) => i.recommended_priority === "Priority Review" && i.status === "submitted").length;
  const overdue = items.filter((i) => i.status === "submitted" && (waitingMinutes(i.submitted_at) || 0) > 30).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Review queue</h1>
        <p className="text-sm text-text-secondary">Synthetic appointment requests awaiting human review.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Waiting" value={waiting} />
        <SummaryCard label="Immediate review" value={immediate} accent="text-status-immediate" />
        <SummaryCard label="Priority review" value={priority} accent="text-status-priority" />
        <SummaryCard label="Overdue (>30m)" value={overdue} accent="text-status-manual" />
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}

      <div className="rounded-card border border-border bg-bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold text-text-primary">Requests</h2>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="focus-ring rounded-input border border-border px-2 py-1 text-sm"
          >
            <option value="">All priorities</option>
            <option value="Immediate Human Review">Immediate Human Review</option>
            <option value="Priority Review">Priority Review</option>
            <option value="Manual Review Required">Manual Review Required</option>
            <option value="Insufficient Information">Insufficient Information</option>
            <option value="Routine Review">Routine Review</option>
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-2">Request</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Recommended priority</th>
              <th className="px-4 py-2">Uncertainty</th>
              <th className="px-4 py-2">Waiting</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs text-text-secondary">{item.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{item.symptom_category}</td>
                <td className="px-4 py-3"><StatusChip category={item.recommended_priority} /></td>
                <td className="px-4 py-3 capitalize text-text-secondary">{item.uncertainty_level || "—"}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {waitingMinutes(item.submitted_at) !== null ? `${waitingMinutes(item.submitted_at)} min` : "—"}
                </td>
                <td className="px-4 py-3 capitalize text-text-secondary">{item.status.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <Link href={`/requests/${item.id}`} className="focus-ring text-sm font-medium text-primary hover:underline">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-text-muted">No requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Disclaimer />
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-card border border-border bg-bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent || "text-text-primary"}`}>{value}</p>
    </div>
  );
}
