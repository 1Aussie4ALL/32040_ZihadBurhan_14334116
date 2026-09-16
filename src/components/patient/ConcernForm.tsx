"use client";

import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/common/Button";
import { CATEGORY_LIST, CATEGORY_META } from "@/data/categories";
import type { ComplaintCategory } from "@/types";

export function ConcernForm({
  initialCategory,
  initialConcernText,
  onBack,
  onNext,
}: {
  initialCategory: ComplaintCategory | null;
  initialConcernText: string;
  onBack: () => void;
  onNext: (category: ComplaintCategory, concernText: string) => void;
}) {
  const [category, setCategory] = useState<ComplaintCategory | null>(initialCategory);
  const [concernText, setConcernText] = useState(initialConcernText);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      setError("Please choose the category that best fits your concern.");
      return;
    }
    if (concernText.trim().length < 3) {
      setError("Please add a short description of your concern.");
      return;
    }
    setError(null);
    onNext(category, concernText.trim());
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">What would you like help with today?</h2>
        <p className="mt-1 text-sm text-muted">Choose the category that fits best, then describe it in your own words.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Category</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_LIST.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={clsx(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                category === c
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand/40",
              )}
            >
              <span className="block font-medium">{CATEGORY_META[c].label}</span>
              <span className="mt-0.5 block text-xs text-muted">{CATEGORY_META[c].description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="concernText" className="text-sm font-medium text-slate-700">
          Describe your concern
        </label>
        <textarea
          id="concernText"
          rows={4}
          placeholder='e.g. "I have had worsening stomach pain since yesterday."'
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          value={concernText}
          onChange={(e) => setConcernText(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">
          This is for appointment triage, not diagnosis — a few sentences is plenty.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
