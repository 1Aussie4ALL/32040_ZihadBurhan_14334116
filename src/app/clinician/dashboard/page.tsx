import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { requireClinician } from "@/lib/auth/session";
import { getClinicianQueue } from "@/lib/database/requests";
import { getDoctorById } from "@/data/doctors";
import { calculateAgeYears } from "@/lib/triage/doctorMatch";
import { Container, Card } from "@/components/common/Card";
import { UrgencyBadge } from "@/components/common/UrgencyBadge";
import { ALL_URGENCY_LEVELS } from "@/types";
import type { UrgencyLevel } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

function buildHref(urgency?: string, reviewed?: string) {
  const params = new URLSearchParams();
  if (urgency) params.set("urgency", urgency);
  if (reviewed) params.set("reviewed", reviewed);
  const qs = params.toString();
  return `/clinician/dashboard${qs ? `?${qs}` : ""}`;
}

export default async function ClinicianDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ urgency?: string; reviewed?: string }>;
}) {
  await requireClinician();
  const { urgency, reviewed } = await searchParams;

  const requests = await getClinicianQueue({
    urgency: urgency && (ALL_URGENCY_LEVELS as readonly string[]).includes(urgency) ? (urgency as UrgencyLevel) : undefined,
    reviewed: reviewed === "true" ? true : reviewed === "false" ? false : undefined,
  });

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incoming appointment requests</h1>
          <p className="mt-1 text-sm text-muted">
            Ordered by urgency, then submission time. {requests.length} request{requests.length === 1 ? "" : "s"} shown.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterLink label="All" active={!urgency && !reviewed} href={buildHref()} />
        {ALL_URGENCY_LEVELS.map((level) => (
          <FilterLink key={level} label={level} active={urgency === level} href={buildHref(level)} />
        ))}
        <span className="mx-1 w-px self-stretch bg-slate-300" aria-hidden="true" />
        <FilterLink label="Unreviewed" active={reviewed === "false"} href={buildHref(urgency, "false")} />
        <FilterLink label="Reviewed" active={reviewed === "true"} href={buildHref(urgency, "true")} />
      </div>

      {requests.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted">No requests match these filters.</Card>
      )}

      <div className="space-y-3">
        {requests.map((req) => {
          const doctor = req.selectedDoctorId ? getDoctorById(req.selectedDoctorId) : undefined;
          const age = calculateAgeYears(req.patient.dateOfBirth);
          const effectiveUrgency = (req.clinicianReview?.overrideUrgency ?? req.triageAssessment?.urgencyLevel) as UrgencyLevel;
          const isOverridden = Boolean(
            req.clinicianReview?.overrideUrgency && req.clinicianReview.overrideUrgency !== req.triageAssessment?.urgencyLevel,
          );
          const isReviewed = Boolean(req.clinicianReview?.reviewed);

          return (
            <Link key={req.id} href={`/clinician/requests/${req.id}`}>
              <Card
                className={clsx(
                  "flex flex-col gap-3 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between",
                  effectiveUrgency === "Emergency" && "border-red-300",
                )}
              >
                <div className="flex items-center gap-3">
                  <UrgencyBadge level={effectiveUrgency} />
                  {isOverridden && (
                    <span className="text-xs font-medium text-slate-500">
                      (overridden from {req.triageAssessment?.urgencyLevel})
                    </span>
                  )}
                </div>

                <div className="flex-1 sm:px-4">
                  <p className="font-semibold text-slate-900">
                    {req.patient.firstName} {req.patient.lastName}
                    <span className="ml-2 font-normal text-muted">{age} yrs</span>
                  </p>
                  <p className="text-sm text-muted line-clamp-1">{req.concernText}</p>
                </div>

                <div className="text-sm text-muted sm:text-right">
                  <p>{doctor?.name ?? "No doctor selected"}</p>
                  <p>
                    {req.appointmentSlot
                      ? new Date(req.appointmentSlot.startTime).toLocaleString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>

                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    isReviewed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {isReviewed ? "Reviewed" : "Unreviewed"}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand/40",
      )}
    >
      {label}
    </Link>
  );
}
