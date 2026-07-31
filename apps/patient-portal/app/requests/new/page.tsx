"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";

const CATEGORIES = [
  "General / unwell",
  "Respiratory (breathing, cough)",
  "Cardiac / chest",
  "Digestive",
  "Musculoskeletal / injury",
  "Mental health",
  "Skin",
  "Other",
];

export default function NewRequestPage() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [freeText, setFreeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (freeText.trim().length < 3) {
      setError("Please describe your symptoms in a few words.");
      return;
    }
    setLoading(true);
    try {
      const request = await apiFetch<{ id: string }>("/api/v1/appointment-requests", {
        method: "POST",
        body: JSON.stringify({ symptom_category: category, free_text: freeText }),
      });
      router.push(`/requests/${request.id}/questions`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Tell us what's going on</h1>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-card border border-border bg-bg-surface p-6 shadow-sm" noValidate>
        {error && (
          <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-text-primary">Which best describes it?</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="free_text" className="block text-sm font-medium text-text-primary">
            Describe how you're feeling, in your own words
          </label>
          <textarea
            id="free_text"
            required
            rows={4}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="e.g. I have been feeling tired and slightly short of breath."
            className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-text-muted">
            We'll ask a few follow-up questions, then match you with a suitable doctor and appointment time.
          </p>
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Continuing…" : "Continue"}</Button>
      </form>
    </main>
  );
}
