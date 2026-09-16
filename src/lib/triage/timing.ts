import type { UrgencyLevel } from "@/types";

// Appointment-time guidance (section 12/13): compares the patient's selected slot
// against the recommended timeframe for their urgency level.

const MAX_WAIT_HOURS: Record<UrgencyLevel, number | null> = {
  Emergency: 0,
  Urgent: 24,
  Priority: 48,
  Routine: null, // no ceiling — any available slot is appropriate
  InsufficientInformation: 48, // conservative default until more information is available
};

export interface TimingAssessment {
  appropriate: boolean;
  message: string | null;
  isEmergencyOverride: boolean;
}

export function assessAppointmentTiming(
  urgencyLevel: UrgencyLevel,
  slotStart: Date,
  now: Date = new Date(),
): TimingAssessment {
  if (urgencyLevel === "Emergency") {
    return {
      appropriate: false,
      isEmergencyOverride: true,
      message:
        "Based on your answers, this appears to need emergency care now — not a scheduled appointment. Please call 000 or attend an emergency department rather than waiting for this booking.",
    };
  }

  const maxHours = MAX_WAIT_HOURS[urgencyLevel];
  if (maxHours === null) {
    return { appropriate: true, message: null, isEmergencyOverride: false };
  }

  const hoursUntil = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil > maxHours) {
    return {
      appropriate: false,
      isEmergencyOverride: false,
      message: `Based on the information you provided, an earlier appointment may be more appropriate (recommended within ${maxHours} hours).`,
    };
  }

  return { appropriate: true, message: null, isEmergencyOverride: false };
}
