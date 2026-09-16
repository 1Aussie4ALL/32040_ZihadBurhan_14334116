"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";

type TimeSlot = { datetime_iso: string; label: string };
type Suggestion = { suggested: TimeSlot | null; reason: string };
type Availability = { time_slots: TimeSlot[] };

function groupSlotsByDay(slots: TimeSlot[]): { day: string; slots: TimeSlot[] }[] {
  const groups = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const day = new Date(slot.datetime_iso).toDateString();
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(slot);
  }
  return Array.from(groups.entries()).map(([day, daySlots]) => ({ day, slots: daySlots }));
}

export default function TimePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [showPopup, setShowPopup] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Suggestion>(`/api/v1/appointment-requests/${id}/time-suggestion`),
      apiFetch<Availability>("/api/v1/appointment-requests/availability"),
    ])
      .then(([s, a]) => {
        setSuggestion(s);
        setAllSlots(a.time_slots);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load appointment times."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chooseTime(slot: TimeSlot) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/appointment-requests/${id}/booking`, {
        method: "PATCH",
        body: JSON.stringify({ preferred_time: slot.datetime_iso }),
      });
      router.push(`/requests/${id}/insurance`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save your chosen time.");
      setBusy(false);
    }
  }

  if (!suggestion) {
    return <main><p className="text-text-secondary">{error || "Finding the best appointment time…"}</p></main>;
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Choose an appointment time</h1>

      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}

      {showPopup && suggestion.suggested && (
        <Modal onClose={() => setShowPopup(false)}>
          <p className="text-sm text-text-secondary">{suggestion.reason}</p>
          <p className="mt-3 rounded-input bg-bg-secondary px-3 py-2 text-lg font-semibold text-text-primary">
            {suggestion.suggested.label}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowPopup(false);
                setShowAll(true);
              }}
            >
              See all available times
            </Button>
            <Button disabled={busy} onClick={() => chooseTime(suggestion.suggested!)}>
              {busy ? "Booking…" : "Book this time"}
            </Button>
          </div>
        </Modal>
      )}

      {(showAll || !suggestion.suggested) && (
        <div className="space-y-3">
          {groupSlotsByDay(allSlots).map(({ day, slots }) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase text-text-muted">{day}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.datetime_iso}
                    disabled={busy}
                    onClick={() => chooseTime(slot)}
                    className="focus-ring cursor-pointer rounded-button border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!showPopup && !showAll && suggestion.suggested && (
        <button onClick={() => setShowPopup(true)} className="focus-ring text-sm font-medium text-primary hover:underline">
          Show suggested time again
        </button>
      )}
    </main>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-card bg-bg-surface p-6 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Suggested appointment time</h2>
          <button onClick={onClose} className="focus-ring text-text-muted" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
