"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmergencyBanner } from "@/components/triage/SafetyBanner";
import { getAvailableSlotsAction } from "@/app/(site)/book/actions";
import { assessAppointmentTiming } from "@/lib/triage/timing";
import { INSURANCE_OPTIONS, getMockPricing, PRICING_DISCLAIMER } from "@/data/insurance";
import type { AppointmentSlotView, InsuranceType, UrgencyLevel } from "@/types";

function formatDayLabel(date: Date, now: Date): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function groupByDay(slots: AppointmentSlotView[], now: Date) {
  const groups = new Map<string, { label: string; slots: AppointmentSlotView[] }>();
  for (const slot of slots) {
    const date = new Date(slot.startTime);
    const key = date.toDateString();
    if (!groups.has(key)) groups.set(key, { label: formatDayLabel(date, now), slots: [] });
    groups.get(key)!.slots.push(slot);
  }
  return Array.from(groups.values());
}

export function AppointmentPicker({
  doctorId,
  urgencyLevel,
  initialSlotId,
  initialInsurance,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  doctorId: string;
  urgencyLevel: UrgencyLevel;
  initialSlotId: string | null;
  initialInsurance: InsuranceType | null;
  onBack: () => void;
  onSubmit: (slotId: string, insuranceType: InsuranceType | null, proceedDespiteWarning: boolean) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const [slots, setSlots] = useState<AppointmentSlotView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(initialSlotId);
  const [insuranceType, setInsuranceType] = useState<InsuranceType | null>(initialInsurance);
  const [preferEarlierOnly, setPreferEarlierOnly] = useState(false);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);

  useEffect(() => {
    // The parent keys this component by doctorId, so a doctor change remounts it
    // with fresh state rather than needing a manual reset here.
    let active = true;
    getAvailableSlotsAction(doctorId).then((res) => {
      if (!active) return;
      if (res.success) setSlots(res.slots);
      else setLoadError(res.error);
    });
    return () => {
      active = false;
    };
  }, [doctorId]);

  const now = useMemo(() => new Date(), []);

  const timingBySlot = useMemo(() => {
    if (!slots) return new Map<string, ReturnType<typeof assessAppointmentTiming>>();
    const map = new Map<string, ReturnType<typeof assessAppointmentTiming>>();
    for (const slot of slots) map.set(slot.id, assessAppointmentTiming(urgencyLevel, new Date(slot.startTime), now));
    return map;
  }, [slots, urgencyLevel, now]);

  const displayedSlots = useMemo(() => {
    if (!slots) return [];
    if (!preferEarlierOnly) return slots;
    return slots.filter((s) => timingBySlot.get(s.id)?.appropriate);
  }, [slots, preferEarlierOnly, timingBySlot]);

  const grouped = groupByDay(displayedSlots, now);
  const selectedSlot = slots?.find((s) => s.id === selectedSlotId) ?? null;
  const selectedTiming = selectedSlotId ? timingBySlot.get(selectedSlotId) ?? null : null;
  const pricing = getMockPricing(insuranceType);

  const canSubmit = Boolean(
    selectedSlotId && (!selectedTiming || selectedTiming.appropriate || acknowledgedWarning),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Choose an appointment time</h2>
        <p className="mt-1 text-sm text-muted">All times are demo availability for this clinic.</p>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!slots && !loadError && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Loading availability…
        </div>
      )}

      {slots && slots.length === 0 && (
        <p className="text-sm text-muted">
          No availability found for this clinician right now. Please go back and choose another doctor.
        </p>
      )}

      {preferEarlierOnly && (
        <div className="flex items-center justify-between rounded-lg bg-brand-light p-3 text-sm text-brand-dark">
          <span>Showing appointments within the recommended timeframe.</span>
          <button type="button" className="font-semibold underline" onClick={() => setPreferEarlierOnly(false)}>
            Show all times
          </button>
        </div>
      )}

      <div className="space-y-5">
        {grouped.map((group) => (
          <div key={group.label}>
            <p className="text-sm font-semibold text-slate-800">{group.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.slots.map((slot) => {
                const appropriate = timingBySlot.get(slot.id)?.appropriate ?? true;
                const selected = selectedSlotId === slot.id;
                return (
                  <button
                    type="button"
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setAcknowledgedWarning(false);
                    }}
                    className={clsx(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "border-brand bg-brand text-white"
                        : appropriate
                          ? "border-slate-200 bg-white text-slate-700 hover:border-brand/40"
                          : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400",
                    )}
                  >
                    {formatTime(new Date(slot.startTime))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedSlot && selectedTiming && !selectedTiming.appropriate && selectedTiming.isEmergencyOverride && (
        <EmergencyBanner message={selectedTiming.message ?? ""} />
      )}

      {selectedSlot && selectedTiming && !selectedTiming.appropriate && !selectedTiming.isEmergencyOverride && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{selectedTiming.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPreferEarlierOnly(true)}>
              View earlier appointments
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAcknowledgedWarning(true)}
            >
              Continue with selected appointment
            </Button>
          </div>
        </div>
      )}

      {selectedSlot && selectedTiming?.isEmergencyOverride && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={acknowledgedWarning}
            onChange={(e) => setAcknowledgedWarning(e.target.checked)}
          />
          I understand this may need emergency care and I will call 000 or attend an emergency department if
          needed. I&apos;d still like to submit this appointment request.
        </label>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Insurance / payment (optional)</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INSURANCE_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setInsuranceType(opt.value)}
              aria-pressed={insuranceType === opt.value}
              className={clsx(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                insuranceType === opt.value
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand/40",
              )}
            >
              <span className="block font-medium">{opt.label}</span>
              <span className="block text-xs text-muted">{opt.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-muted">
          <p>
            Estimated fee: ${pricing.consultFee.toFixed(2)}
            {pricing.rebate ? ` — Medicare rebate ~$${pricing.rebate.toFixed(2)}, out of pocket ~$${pricing.outOfPocket.toFixed(2)}` : ""}
          </p>
          <p className="mt-1">{pricing.note}</p>
          <p className="mt-1">{PRICING_DISCLAIMER}</p>
        </div>
      </fieldset>

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={() => selectedSlotId && onSubmit(selectedSlotId, insuranceType, acknowledgedWarning)}
        >
          {submitting ? "Submitting…" : "Confirm appointment request"}
        </Button>
      </div>
    </div>
  );
}
