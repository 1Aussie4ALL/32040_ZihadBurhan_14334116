"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch, ApiError } from "@/lib/api";

type AuditEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_role: string | null;
  target_type: string;
  target_id: string;
  action: string;
  occurred_at: string;
};

export default function AuditPage() {
  return (
    <AppShell allowedRoles={["manager", "nurse"]}>
      <AuditContent />
    </AppShell>
  );
}

function AuditContent() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [requestId, setRequestId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const params = requestId ? `?target_id=${encodeURIComponent(requestId)}` : "";
      const data = await apiFetch<AuditEvent[]>(`/api/v1/audit/events${params}`);
      setEvents(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load audit events.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Audit explorer</h1>
        <p className="text-sm text-text-secondary">Append-only record of system and staff actions. Entries cannot be edited or deleted.</p>
      </div>

      <div className="flex gap-2">
        <input
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          placeholder="Filter by request ID"
          className="focus-ring rounded-input border border-border px-3 py-2 text-sm"
        />
        <button onClick={load} className="focus-ring rounded-button border border-primary px-3 py-2 text-sm text-primary">Filter</button>
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}

      <div className="rounded-card border border-border bg-bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Actor role</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-border align-top">
                <td className="px-4 py-2 whitespace-nowrap text-text-muted">{new Date(e.occurred_at).toLocaleString()}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{e.event_type}</td>
                <td className="px-4 py-2 capitalize text-text-secondary">{e.actor_role || "system"}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{e.target_type} / {e.target_id.slice(0, 8)}</td>
                <td className="px-4 py-2 text-text-primary">{e.action}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-text-muted">No audit events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
