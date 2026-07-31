"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";

const PRIVATE_FUNDS = ["Bupa", "Medibank", "HCF", "NIB", "AHM", "Other"];

const INSURANCE_OPTIONS = [
  {
    value: "medicare",
    label: "Medicare",
    note: "Your clinic will confirm whether this visit is bulk-billed or attracts a gap fee, and any Medicare rebate you're entitled to, at check-in.",
  },
  {
    value: "private",
    label: "Private health insurance",
    note: "Rebates vary by fund and policy tier. Your clinic will confirm your out-of-pocket cost, if any, at check-in.",
  },
  {
    value: "self_funded",
    label: "Self-funded / no cover",
    note: "The full consultation fee applies, payable at your appointment.",
  },
];

export default function InsurancePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [insuranceType, setInsuranceType] = useState("medicare");
  const [provider, setProvider] = useState(PRIVATE_FUNDS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = INSURANCE_OPTIONS.find((o) => o.value === insuranceType)!;

  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/appointment-requests/${id}/booking`, {
        method: "PATCH",
        body: JSON.stringify({
          insurance_type: insuranceType,
          insurance_provider: insuranceType === "private" ? provider : null,
        }),
      });
      router.push(`/requests/${id}/review`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save this information.");
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">How will you be covering this visit?</h1>
        <p className="mt-1 text-sm text-text-secondary">
          This helps clinic staff prepare — it isn't stored as sensitive financial information, just a general
          billing category.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-card border border-border bg-bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {INSURANCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`focus-ring cursor-pointer rounded-button border px-4 py-2 text-sm ${
                insuranceType === option.value ? "border-primary bg-primary-light text-primary" : "border-border text-text-secondary"
              }`}
            >
              <input
                type="radio"
                name="insurance_type"
                value={option.value}
                className="sr-only"
                checked={insuranceType === option.value}
                onChange={() => setInsuranceType(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>

        {insuranceType === "private" && (
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-text-primary">Health fund</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm"
            >
              {PRIVATE_FUNDS.map((fund) => (
                <option key={fund} value={fund}>{fund}</option>
              ))}
            </select>
          </div>
        )}

        <p className="rounded-input bg-bg-secondary px-3 py-2 text-xs text-text-secondary">{selected.note}</p>

        <Button disabled={busy} onClick={handleContinue}>{busy ? "Saving…" : "Continue"}</Button>
      </div>
    </main>
  );
}
