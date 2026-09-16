import type { ComplaintCategory, UrgencyLevel } from "@/types";

// Shared mappings used by both the mock AI provider and the triage decision engine's
// fallback path, so the two never drift out of sync (no duplicated business logic).

export const CLINICIAN_TYPE_BY_CATEGORY: Record<ComplaintCategory, string> = {
  cardiovascular: "General Practitioner",
  respiratory: "General Practitioner",
  abdominal: "General Practitioner",
  musculoskeletal: "Sports / Minor Injury GP",
  skin: "General Practitioner",
  neurological: "General Practitioner",
  mental_wellbeing: "Mental Health GP",
  fever_infection: "General Practitioner",
  injury: "Sports / Minor Injury GP",
  medication: "General Practitioner",
  general_consultation: "General Practitioner",
  other: "General Practitioner",
};

export const TIMEFRAME_BY_URGENCY: Record<UrgencyLevel, string> = {
  Emergency: "Immediate — this appears to need emergency care now",
  Urgent: "Within 4–24 hours",
  Priority: "Within 24–48 hours",
  Routine: "Within 1–2 weeks",
  InsufficientInformation: "Cannot be determined from the information provided",
};

export const URGENCY_META: Record<
  UrgencyLevel,
  { label: string; description: string; badgeClass: string; icon: "siren" | "triangle-alert" | "clock" | "calendar-check" | "circle-help" }
> = {
  Emergency: {
    label: "Emergency",
    description: "Potential immediate threat requiring emergency assessment.",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
    icon: "siren",
  },
  Urgent: {
    label: "Urgent",
    description: "Requires prompt professional assessment; should not wait for a routine appointment.",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "triangle-alert",
  },
  Priority: {
    label: "Priority",
    description: "Should be reviewed sooner than a standard routine booking.",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "clock",
  },
  Routine: {
    label: "Routine",
    description: "Suitable for standard appointment availability.",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: "calendar-check",
  },
  InsufficientInformation: {
    label: "Insufficient Information",
    description: "The information provided isn't enough to safely determine a priority.",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    icon: "circle-help",
  },
};
