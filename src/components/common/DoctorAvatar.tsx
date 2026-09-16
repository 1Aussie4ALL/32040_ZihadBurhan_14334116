import clsx from "clsx";
import type { DoctorSeed } from "@/types";

// No external photos are used (avoids sourcing/licensing fictional headshots) —
// a coloured initials avatar keeps doctor cards clean and consistent instead.

export function DoctorAvatar({ doctor, size = 40 }: { doctor: Pick<DoctorSeed, "avatarInitials" | "avatarColor" | "name">; size?: number }) {
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", doctor.avatarColor)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {doctor.avatarInitials}
    </span>
  );
}
