import { Siren, TriangleAlert, Clock, CalendarCheck, CircleHelp } from "lucide-react";
import clsx from "clsx";
import { URGENCY_META } from "@/lib/triage/mappings";
import type { UrgencyLevel } from "@/types";

// Urgency is always shown with text AND an icon, never colour alone (section 25).

const ICONS = {
  siren: Siren,
  "triangle-alert": TriangleAlert,
  clock: Clock,
  "calendar-check": CalendarCheck,
  "circle-help": CircleHelp,
} as const;

export function UrgencyBadge({
  level,
  size = "md",
  className,
}: {
  level: UrgencyLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = URGENCY_META[level];
  const Icon = ICONS[meta.icon];
  const sizeClasses =
    size === "sm" ? "text-xs px-2 py-0.5 gap-1" : size === "lg" ? "text-sm px-3.5 py-2 gap-2" : "text-xs px-2.5 py-1 gap-1.5";
  const iconSize = size === "lg" ? 16 : 14;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-semibold",
        meta.badgeClass,
        sizeClasses,
        className,
      )}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
