import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, CalendarDays, MapPin } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { LinkButton } from "@/components/common/Button";
import { UrgencyBadge } from "@/components/common/UrgencyBadge";
import { Disclaimer } from "@/components/common/Disclaimer";
import { EmergencyBanner } from "@/components/triage/SafetyBanner";
import { DoctorAvatar } from "@/components/common/DoctorAvatar";
import { getRequestDetail } from "@/lib/database/requests";
import { getDoctorById } from "@/data/doctors";
import type { UrgencyLevel } from "@/types";

export const metadata: Metadata = { title: "Booking Confirmed" };

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getRequestDetail(id);
  if (!request || !request.triageAssessment) notFound();

  const doctor = request.selectedDoctorId ? getDoctorById(request.selectedDoctorId) : undefined;
  const urgencyLevel = request.triageAssessment.urgencyLevel as UrgencyLevel;
  const isEmergency = urgencyLevel === "Emergency";

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3 text-emerald-700">
          <CheckCircle2 size={28} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900">Appointment request submitted</h1>
        </div>

        {isEmergency && (
          <EmergencyBanner message="Your answers included symptoms that may require immediate medical attention. Please don't wait for this appointment if your symptoms are severe." />
        )}

        <Card className="p-6">
          <p className="text-sm text-muted">Reference</p>
          <p className="font-mono text-sm text-slate-800">{request.id}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <UrgencyBadge level={urgencyLevel} size="lg" />
            <span className="text-sm text-muted">
              Suggested timeframe: <strong className="text-slate-800">{request.triageAssessment.recommendedTimeframe}</strong>
            </span>
          </div>

          {doctor && (
            <div className="mt-5 flex items-center gap-3 border-t border-border-subtle pt-5">
              <DoctorAvatar doctor={doctor} size={44} />
              <div>
                <p className="font-semibold text-slate-900">{doctor.name}</p>
                <p className="text-sm text-muted">{doctor.specialty}</p>
              </div>
            </div>
          )}

          {request.appointmentSlot && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <CalendarDays size={16} className="text-brand" aria-hidden="true" />
              {new Date(request.appointmentSlot.startTime).toLocaleString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          )}

          {doctor && (
            <div className="mt-2 flex items-start gap-2 text-sm text-muted">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {doctor.clinicLocation}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <p className="font-semibold text-slate-900">What happens next</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Your request, including the AI-assisted urgency assessment, is now visible to our clinical team.
            A clinician reviews every request — regardless of urgency level — before it is treated as final,
            and may contact you if anything needs to be confirmed.
          </p>
        </Card>

        <Disclaimer />

        <div className="flex justify-center gap-3">
          <LinkButton href="/" variant="outline">
            Return to home
          </LinkButton>
          <LinkButton href="/book">Book another appointment</LinkButton>
        </div>
      </div>
    </Container>
  );
}
