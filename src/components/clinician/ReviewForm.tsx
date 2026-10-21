"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { ValidationDialog, useValidationPrompt } from "@/components/common/ValidationPrompt";
import { ALL_URGENCY_LEVELS } from "@/types";
import type { UrgencyLevel } from "@/types";
import { submitReviewAction } from "@/app/clinician/actions";

export function ReviewForm({
  requestId,
  systemUrgency,
  existingOverride,
  existingReason,
  existingNote,
  alreadyReviewed,
}: {
  requestId: string;
  systemUrgency: UrgencyLevel;
  existingOverride: UrgencyLevel | null;
  existingReason: string | null;
  existingNote: string | null;
  alreadyReviewed: boolean;
}) {
  const router = useRouter();
  const [overrideUrgency, setOverrideUrgency] = useState<UrgencyLevel | "">(existingOverride ?? "");
  const [reason, setReason] = useState(existingReason ?? "");
  const [note, setNote] = useState(existingNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const prompt = useValidationPrompt();

  async function handleSave(markReviewed: boolean) {
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    if (overrideUrgency && overrideUrgency !== systemUrgency && !reason.trim()) {
      setError("Please provide a reason for overriding the system classification.");
      prompt.report([{ fieldId: "reason", message: "Please provide a reason for overriding the system classification." }]);
      setSaving(false);
      return;
    }

    const res = await submitReviewAction({
      requestId,
      overrideUrgency: overrideUrgency || null,
      overrideReason: reason.trim() || undefined,
      note: note.trim() || undefined,
      markReviewed,
    });

    setSaving(false);
    if (res.success) {
      setSavedMessage(markReviewed ? "Marked as reviewed." : "Saved.");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Original system result: {systemUrgency}</p>
      </div>

      <div>
        <label htmlFor="override" className="text-sm font-medium text-slate-700">
          Clinician override (optional)
        </label>
        <select
          id="override"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          value={overrideUrgency}
          onChange={(e) => setOverrideUrgency(e.target.value as UrgencyLevel | "")}
        >
          <option value="">No override — keep system result</option>
          {ALL_URGENCY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      {overrideUrgency && overrideUrgency !== systemUrgency && (
        <div>
          <label htmlFor="reason" className="text-sm font-medium text-slate-700">
            Reason for override (required)
          </label>
          <textarea
            id="reason"
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}

      <div>
        <label htmlFor="note" className="text-sm font-medium text-slate-700">
          Clinician / reception note
        </label>
        <textarea
          id="note"
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {savedMessage && <p className="text-sm text-emerald-700">{savedMessage}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={saving} onClick={() => void handleSave(false)}>
          Save note / override
        </Button>
        <Button type="button" disabled={saving} onClick={() => void handleSave(true)}>
          {alreadyReviewed ? "Update & keep reviewed" : "Mark as reviewed"}
        </Button>
      </div>

      <ValidationDialog {...prompt} />
    </div>
  );
}
