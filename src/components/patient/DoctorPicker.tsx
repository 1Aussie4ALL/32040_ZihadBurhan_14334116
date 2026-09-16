"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { MapPin } from "lucide-react";
import { Button } from "@/components/common/Button";
import { DoctorAvatar } from "@/components/common/DoctorAvatar";
import { DOCTORS } from "@/data/doctors";
import { recommendDoctors } from "@/lib/triage/doctorMatch";
import type { ComplaintCategory } from "@/types";

export function DoctorPicker({
  category,
  ageYears,
  initialDoctorId,
  onBack,
  onNext,
}: {
  category: ComplaintCategory;
  ageYears: number | null;
  initialDoctorId: string | null;
  onBack: () => void;
  onNext: (doctorId: string) => void;
}) {
  const recommended = useMemo(() => recommendDoctors(category, ageYears, 3), [category, ageYears]);
  const recommendedIds = new Set(recommended.map((d) => d.id));
  const others = DOCTORS.filter((d) => !recommendedIds.has(d.id));

  const [showAll, setShowAll] = useState(Boolean(initialDoctorId && !recommendedIds.has(initialDoctorId)));
  const [selected, setSelected] = useState<string | null>(initialDoctorId);

  const visibleDoctors = showAll ? DOCTORS : recommended;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Choose a clinician</h2>
        <p className="mt-1 text-sm text-muted">
          Based on the information provided, these clinicians may be suitable for your appointment request.
          You&apos;re free to choose anyone.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleDoctors.map((doctor) => (
          <button
            type="button"
            key={doctor.id}
            onClick={() => setSelected(doctor.id)}
            aria-pressed={selected === doctor.id}
            className={clsx(
              "rounded-xl border p-4 text-left transition-colors",
              selected === doctor.id ? "border-brand bg-brand-light" : "border-slate-200 bg-white hover:border-brand/40",
            )}
          >
            <div className="flex items-center gap-3">
              <DoctorAvatar doctor={doctor} size={48} />
              <div>
                <p className="font-semibold text-slate-900">{doctor.name}</p>
                <p className="text-sm text-brand">{doctor.specialty}</p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{doctor.bio}</p>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
              <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> {doctor.clinicLocation}
            </p>
          </button>
        ))}
      </div>

      {!showAll && others.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm font-semibold text-brand hover:underline"
        >
          See all doctors
        </button>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" disabled={!selected} onClick={() => selected && onNext(selected)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
