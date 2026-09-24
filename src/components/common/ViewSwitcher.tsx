"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ClipboardList, Loader2, User } from "lucide-react";
import clsx from "clsx";
import { switchToReceptionAction } from "@/app/clinician/actions";

// Patient / Reception toggle shown in both headers, so a demo can book as a patient
// and then see the request land in the reception queue without retyping a login.
// Switching back returns to the last patient page rather than the home page.

const LAST_PATIENT_PATH_KEY = "meridian:lastPatientPath";

export function rememberPatientPath(path: string) {
  try {
    sessionStorage.setItem(LAST_PATIENT_PATH_KEY, path);
  } catch {
    // Storage unavailable (private mode etc.): switching back just goes home.
  }
}

function lastPatientPath(): string {
  try {
    return sessionStorage.getItem(LAST_PATIENT_PATH_KEY) ?? "/";
  } catch {
    return "/";
  }
}

type Tone = "light" | "dark";

const TONE = {
  light: {
    group: "bg-slate-100",
    active: "bg-white text-brand-dark shadow-sm",
    idle: "text-slate-600 hover:text-slate-900",
  },
  dark: {
    group: "bg-white/10",
    active: "bg-white text-slate-900 shadow-sm",
    idle: "text-slate-300 hover:text-white",
  },
} satisfies Record<Tone, Record<string, string>>;

const SEGMENT = "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3";

export function ViewSwitcher({
  current,
  tone = "light",
  className,
}: {
  current: "patient" | "reception";
  tone?: Tone;
  className?: string;
}) {
  const router = useRouter();
  const t = TONE[tone];

  return (
    <div role="group" aria-label="Switch view" className={clsx("flex items-center rounded-full p-1", t.group, className)}>
      {current === "patient" ? (
        <span aria-current="true" className={clsx(SEGMENT, t.active)}>
          <User size={14} aria-hidden="true" /> Patient
        </span>
      ) : (
        <Link
          href="/"
          className={clsx(SEGMENT, t.idle)}
          onClick={(e) => {
            const path = lastPatientPath();
            if (path !== "/") {
              e.preventDefault();
              router.push(path);
            }
          }}
        >
          <User size={14} aria-hidden="true" /> Patient
        </Link>
      )}

      {current === "reception" ? (
        <span aria-current="true" className={clsx(SEGMENT, t.active)}>
          <ClipboardList size={14} aria-hidden="true" /> Reception
        </span>
      ) : (
        <form action={switchToReceptionAction}>
          <ReceptionButton className={clsx(SEGMENT, t.idle)} />
        </form>
      )}
    </div>
  );
}

function ReceptionButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <ClipboardList size={14} aria-hidden="true" />
      )}
      Reception
    </button>
  );
}
