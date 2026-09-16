"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Disclaimer from "@/components/Disclaimer";
import { apiFetch, ApiError } from "@/lib/api";

export default function ConsentPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/patients/me/consents", {
        method: "POST",
        body: JSON.stringify({ consent_type: "synthetic_intake_and_ai_processing", granted: true }),
      });
      router.push("/requests/new");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to record consent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Before you continue</h1>
      <div className="space-y-3 rounded-card border border-border bg-bg-surface p-6 shadow-sm text-sm text-text-secondary">
        <p>
          This is an academic prototype using <strong>synthetic (made-up) data only</strong>. By continuing, you
          agree that:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Information you enter will be processed by a rule-based system and a mock AI component for research purposes.</li>
          <li>Your responses will be reviewed by a (simulated) staff member as part of this demonstration.</li>
          <li>This tool does not diagnose conditions, prescribe treatment, or dispatch emergency services.</li>
        </ul>
        <label className="flex items-start gap-2 pt-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="focus-ring mt-1"
          />
          <span>I understand and consent to this synthetic academic demonstration processing my (fictional) information.</span>
        </label>
      </div>
      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}
      <Button disabled={!checked || loading} onClick={handleContinue}>
        {loading ? "Saving…" : "Continue"}
      </Button>
      <Disclaimer />
    </main>
  );
}
