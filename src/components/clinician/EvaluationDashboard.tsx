"use client";

import { useState } from "react";
import clsx from "clsx";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { UrgencyBadge } from "@/components/common/UrgencyBadge";
import { runEvaluationAction } from "@/app/clinician/actions";
import { ALL_URGENCY_LEVELS } from "@/types";
import type { EvaluationSummary } from "@/types";

export function EvaluationDashboard({
  initialSummary,
  scenarioCount,
}: {
  initialSummary: EvaluationSummary | null;
  scenarioCount: number;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    const res = await runEvaluationAction();
    setRunning(false);
    if (res.success) setSummary(res.summary);
    else setError(res.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Research evaluation</h1>
          <p className="mt-1 text-sm text-muted">
            Runs every synthetic scenario through the live triage pipeline (safety rules + AI + application
            logic) and compares the result against the expected urgency.
            {summary && ` Last run: ${new Date(summary.runAt).toLocaleString("en-AU")}.`}
          </p>
        </div>
        <Button onClick={() => void handleRun()} disabled={running}>
          {running ? "Running…" : `Run evaluation (${scenarioCount} scenarios)`}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!summary && !running && (
        <Card className="p-8 text-center text-sm text-muted">
          No evaluation run yet. Click &quot;Run evaluation&quot; to test the triage engine.
        </Card>
      )}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <MetricCard label="Accuracy" value={`${(summary.accuracy * 100).toFixed(0)}%`} sub={`${summary.correctCount}/${summary.totalScenarios} correct`} />
            <MetricCard
              label="Under-triage rate"
              value={`${(summary.underTriageRate * 100).toFixed(0)}%`}
              sub={`${summary.underTriageCount} case(s) — system too low`}
              tone="danger"
            />
            <MetricCard
              label="Over-triage rate"
              value={`${(summary.overTriageRate * 100).toFixed(0)}%`}
              sub={`${summary.overTriageCount} case(s) — system too high`}
              tone="warn"
            />
            <MetricCard label="Scenarios" value={String(summary.totalScenarios)} sub="synthetic patient cases" />
          </div>

          <Card className="overflow-x-auto p-6">
            <h2 className="text-lg font-semibold text-slate-900">Confusion matrix</h2>
            <p className="text-sm text-muted">Rows: expected urgency. Columns: system (final) urgency.</p>
            <table className="mt-4 min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium text-muted">Expected \ System</th>
                  {ALL_URGENCY_LEVELS.map((l) => (
                    <th key={l} className="p-2 text-center font-medium text-muted">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_URGENCY_LEVELS.map((expected) => (
                  <tr key={expected} className="border-t border-border-subtle">
                    <th className="p-2 text-left font-medium text-slate-700">{expected}</th>
                    {ALL_URGENCY_LEVELS.map((actual) => {
                      const count = summary.confusionMatrix[expected]?.[actual] ?? 0;
                      return (
                        <td
                          key={actual}
                          className={clsx(
                            "p-2 text-center",
                            expected === actual && count > 0 && "bg-emerald-50 font-semibold text-emerald-800",
                            expected !== actual && count > 0 && "bg-amber-50 font-semibold text-amber-800",
                          )}
                        >
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto p-6">
            <h2 className="text-lg font-semibold text-slate-900">Scenario results</h2>
            <table className="mt-4 min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="p-2">Scenario</th>
                  <th className="p-2">Expected</th>
                  <th className="p-2">System</th>
                  <th className="p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {summary.results.map((r) => (
                  <tr key={r.scenarioId} className="border-t border-border-subtle align-top">
                    <td className="p-2">
                      <p className="font-medium text-slate-800">{r.scenarioId}</p>
                      <p className="text-xs text-muted">{r.scenarioDescription}</p>
                    </td>
                    <td className="p-2">
                      <UrgencyBadge level={r.expectedUrgency} size="sm" />
                    </td>
                    <td className="p-2">
                      <UrgencyBadge level={r.systemUrgency} size="sm" />
                    </td>
                    <td className="p-2">
                      {r.correct ? (
                        <span className="font-medium text-emerald-700">Correct</span>
                      ) : r.underTriaged ? (
                        <span className="font-medium text-red-700">Under-triaged</span>
                      ) : (
                        <span className="font-medium text-amber-700">Over-triaged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "warn" | "danger";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={clsx(
          "mt-1 text-2xl font-bold",
          tone === "danger" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-slate-900",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </Card>
  );
}
