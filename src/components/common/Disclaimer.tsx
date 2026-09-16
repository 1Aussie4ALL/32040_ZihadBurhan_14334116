import { ShieldCheck } from "lucide-react";

export function Disclaimer({ variant = "inline" }: { variant?: "inline" | "compact" }) {
  if (variant === "compact") {
    return (
      <p className="text-xs text-muted">
        Academic prototype — decision-support only. Does not diagnose and does not replace a healthcare
        professional. Uses synthetic demo data. In a medical emergency, call{" "}
        <strong className="font-semibold">000</strong>.
      </p>
    );
  }

  return (
    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <ShieldCheck className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
      <div>
        <p className="font-semibold">This is decision-support only, not a diagnosis.</p>
        <p className="mt-1 leading-relaxed">
          This academic prototype does not diagnose medical conditions and does not replace a healthcare
          professional. Everything you provide is used to help prepare for your appointment — a clinician
          always makes the final decision. All information on this site, including patient records, is
          synthetic demo data. In a medical emergency, call <strong className="font-semibold">000</strong>{" "}
          or attend your nearest emergency department.
        </p>
      </div>
    </div>
  );
}
