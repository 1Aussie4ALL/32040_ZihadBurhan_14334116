import clsx from "clsx";
import { Check } from "lucide-react";

const STEPS = ["Details", "Your Concern", "Questions", "Assessment", "Doctor", "Appointment", "Confirmation"];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Booking progress" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {STEPS.map((label, i) => {
          const stepNumber = i + 1;
          const status = stepNumber < currentStep ? "done" : stepNumber === currentStep ? "current" : "upcoming";
          return (
            <li key={label} className="flex items-center gap-1 sm:gap-2">
              <div
                className={clsx(
                  "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium sm:px-3 sm:text-sm",
                  status === "done" && "bg-brand-light text-brand-dark",
                  status === "current" && "bg-brand text-white",
                  status === "upcoming" && "bg-slate-100 text-slate-500",
                )}
                aria-current={status === "current" ? "step" : undefined}
              >
                <span
                  className={clsx(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    status === "done" && "bg-brand text-white",
                    status === "current" && "bg-white text-brand",
                    status === "upcoming" && "bg-slate-300 text-white",
                  )}
                >
                  {status === "done" ? <Check size={12} aria-hidden="true" /> : stepNumber}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {stepNumber < STEPS.length && <span className="h-px w-3 shrink-0 bg-slate-300 sm:w-6" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
