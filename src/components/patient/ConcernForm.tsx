"use client";

import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/common/Button";
import { ValidationDialog, useValidationPrompt } from "@/components/common/ValidationPrompt";
import { CATEGORY_LIST, CATEGORY_META } from "@/data/categories";
import type { ComplaintCategory } from "@/types";

const MAX_CONCERN_LENGTH = 1000;

type ConcernErrors = { category?: string; concernText?: string };

export function ConcernForm({
  initialCategory,
  initialConcernText,
  initialErrors,
  onBack,
  onNext,
}: {
  initialCategory: ComplaintCategory | null;
  initialConcernText: string;
  /** Errors to show on arrival, e.g. when the final submit sent the patient back here. */
  initialErrors?: ConcernErrors;
  onBack: () => void;
  onNext: (category: ComplaintCategory, concernText: string) => void;
}) {
  const [category, setCategory] = useState<ComplaintCategory | null>(initialCategory);
  const [concernText, setConcernText] = useState(initialConcernText);
  const [errors, setErrors] = useState<ConcernErrors>(initialErrors ?? {});
  const prompt = useValidationPrompt();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const length = concernText.trim().length;
    if (!category) next.category = "Please choose the category that best fits your concern.";
    if (length < 3) next.concernText = "Please add a short description of your concern.";
    else if (length > MAX_CONCERN_LENGTH)
      next.concernText = `Your description is too long (${length} characters). Please keep it under ${MAX_CONCERN_LENGTH}.`;
    setErrors(next);
    const ok = prompt.report([
      ...(next.category ? [{ fieldId: "category-options", message: next.category }] : []),
      ...(next.concernText ? [{ fieldId: "concernText", message: next.concernText }] : []),
    ]);
    if (ok && category) onNext(category, concernText.trim());
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">What would you like help with today?</h2>
        <p className="mt-1 text-sm text-muted">Choose the category that fits best, then describe it in your own words.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Category</legend>
        <div id="category-options" className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_LIST.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => {
                setCategory(c);
                setErrors((prev) => ({ ...prev, category: undefined }));
              }}
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
        {errors.category && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.category}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="concernText" className="text-sm font-medium text-slate-700">
          Describe your concern
        </label>
        <textarea
          id="concernText"
          rows={4}
          placeholder='e.g. "I have had worsening stomach pain since yesterday."'
          className={clsx(
            "mt-1 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand",
            errors.concernText ? "border-red-400" : "border-slate-300",
          )}
          value={concernText}
          onChange={(e) => {
            setConcernText(e.target.value);
            setErrors((prev) => ({ ...prev, concernText: undefined }));
          }}
        />
        {errors.concernText && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errors.concernText}
          </p>
        )}
        <p className={clsx("mt-1 text-xs", concernText.length > MAX_CONCERN_LENGTH ? "text-red-600" : "text-muted")}>
          This is for appointment triage, not diagnosis — a few sentences is plenty.
          {concernText.length > MAX_CONCERN_LENGTH * 0.8 && ` (${concernText.length}/${MAX_CONCERN_LENGTH})`}
        </p>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
      </div>

      <ValidationDialog {...prompt} />
    </form>
  );
}
