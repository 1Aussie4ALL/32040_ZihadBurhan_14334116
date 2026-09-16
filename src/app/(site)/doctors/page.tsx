import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { LinkButton } from "@/components/common/Button";
import { DoctorAvatar } from "@/components/common/DoctorAvatar";
import { DOCTORS } from "@/data/doctors";

export const metadata: Metadata = { title: "Doctors" };

export default function DoctorsPage() {
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold text-slate-900">Our doctors</h1>
      <p className="mt-2 max-w-2xl text-muted">
        All clinicians below are fictional, created for this academic prototype. When you request an
        appointment, we&apos;ll suggest 2–3 clinicians based on your answers, but you can always book with
        anyone here.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {DOCTORS.map((doctor) => (
          <Card key={doctor.id} className="flex flex-col p-6">
            <div className="flex items-center gap-4">
              <DoctorAvatar doctor={doctor} size={56} />
              <div>
                <p className="text-lg font-semibold text-slate-900">{doctor.name}</p>
                <p className="text-sm text-brand">{doctor.specialty}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{doctor.qualifications}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{doctor.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {doctor.areasOfInterest.map((area) => (
                <span key={area} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  {area}
                </span>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
              <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {doctor.clinicLocation}
            </p>
            <LinkButton href={`/book?doctor=${doctor.id}`} variant="outline" className="mt-4">
              Request an appointment
            </LinkButton>
          </Card>
        ))}
      </div>
    </Container>
  );
}
