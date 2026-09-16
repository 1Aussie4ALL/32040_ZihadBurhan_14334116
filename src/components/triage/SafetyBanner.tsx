import { Siren } from "lucide-react";

// The visually distinctive emergency response required by section 13. Never claims
// diagnostic certainty and never offers false reassurance.

export function EmergencyBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border-2 border-red-600 bg-red-50 p-5 text-red-900"
    >
      <div className="flex items-start gap-3">
        <Siren className="mt-0.5 shrink-0" size={28} aria-hidden="true" />
        <div>
          <p className="text-lg font-bold">This may be a medical emergency</p>
          <p className="mt-1 text-sm leading-relaxed">{message}</p>
          <p className="mt-3 font-semibold">
            If this is a medical emergency, call 000 or attend your nearest emergency department now.
          </p>
        </div>
      </div>
    </div>
  );
}
