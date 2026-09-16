"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";

type Doctor = { id: string; name: string; specialty: string; bio: string };
type Suggestions = { suggested: Doctor[]; reason: string };
type Availability = { doctors: Doctor[] };

export default function DoctorsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [busyDoctorId, setBusyDoctorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Suggestions>(`/api/v1/appointment-requests/${id}/doctor-suggestions`),
      apiFetch<Availability>("/api/v1/appointment-requests/availability"),
    ])
      .then(([s, a]) => {
        setSuggestions(s);
        setAllDoctors(a.doctors);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load doctor suggestions."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function chooseDoctor(doctor: Doctor) {
    setBusyDoctorId(doctor.id);
    setError(null);
    try {
      await apiFetch(`/api/v1/appointment-requests/${id}/booking`, {
        method: "PATCH",
        body: JSON.stringify({ preferred_doctor: doctor.name }),
      });
      router.push(`/requests/${id}/time`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save your doctor choice.");
      setBusyDoctorId(null);
    }
  }

  if (!suggestions) {
    return <main><p className="text-text-secondary">{error || "Finding the right doctors for you…"}</p></main>;
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Choose a doctor</h1>
        <p className="mt-1 text-sm text-text-secondary">{suggestions.reason}</p>
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {suggestions.suggested.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} busy={busyDoctorId === doctor.id} onChoose={() => chooseDoctor(doctor)} />
        ))}
      </div>

      {!showAll && (
        <button onClick={() => setShowAll(true)} className="focus-ring text-sm font-medium text-primary hover:underline">
          See all doctors →
        </button>
      )}

      {showAll && (
        <div className="space-y-3 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-text-primary">All doctors</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {allDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} busy={busyDoctorId === doctor.id} onChoose={() => chooseDoctor(doctor)} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function DoctorCard({ doctor, busy, onChoose }: { doctor: Doctor; busy: boolean; onChoose: () => void }) {
  return (
    <div className="flex flex-col justify-between rounded-card border border-border bg-bg-surface p-4 shadow-sm">
      <div>
        <p className="font-semibold text-text-primary">{doctor.name}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{doctor.specialty}</p>
        <p className="mt-2 text-sm text-text-secondary">{doctor.bio}</p>
      </div>
      <Button className="mt-4" disabled={busy} onClick={onChoose}>
        {busy ? "Saving…" : "Choose this doctor"}
      </Button>
    </div>
  );
}
