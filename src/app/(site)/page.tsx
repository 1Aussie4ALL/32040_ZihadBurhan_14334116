import Link from "next/link";
import { ArrowRight, ClipboardList, MessagesSquare, ShieldCheck, UserCheck } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { LinkButton } from "@/components/common/Button";
import { Disclaimer } from "@/components/common/Disclaimer";
import { DOCTORS } from "@/data/doctors";
import { DoctorAvatar } from "@/components/common/DoctorAvatar";

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Describe your concern",
    body: "Tell us in your own words what's going on, or choose a category to get started quickly.",
  },
  {
    icon: ClipboardList,
    title: "Answer a few adaptive questions",
    body: "We ask around 8–10 short questions, chosen based on your answers — not a long generic form.",
  },
  {
    icon: ShieldCheck,
    title: "Get an urgency assessment",
    body: "A deterministic safety check runs first, then AI-assisted analysis suggests an urgency level and explains why.",
  },
  {
    icon: UserCheck,
    title: "Choose your clinician & time",
    body: "See suitable doctors and appointment times — we'll flag it if an earlier slot may be more appropriate.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border-subtle bg-gradient-to-b from-brand-light/40 to-transparent">
        <Container className="grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
              Academic prototype — decision support only
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Book your appointment with the right clinician, at the right time.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
              Meridian Health Clinic&apos;s appointment request system asks a few adaptive questions about your
              concern, then suggests how urgently it should be seen and which clinician suits it best — so
              your doctor starts your visit already prepared.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/book" size="lg">
                Book an Appointment <ArrowRight size={18} aria-hidden="true" />
              </LinkButton>
              <LinkButton href="/services" size="lg" variant="outline">
                Explore services
              </LinkButton>
            </div>
          </div>
          <Card className="p-6">
            <Disclaimer />
          </Card>
        </Container>
      </section>

      <section id="how-it-works" className="py-16">
        <Container>
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">How an appointment request works</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Every request is assessed by deterministic safety rules first, then AI-assisted analysis — never
            the other way around. A clinician always reviews the result before your appointment.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand-dark">
                  <step.icon size={20} aria-hidden="true" />
                </div>
                <p className="mt-4 text-xs font-semibold text-brand">Step {i + 1}</p>
                <p className="mt-1 font-semibold text-slate-900">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border-subtle bg-slate-50 py-16">
        <Container>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Meet some of our clinicians</h2>
              <p className="mt-2 max-w-2xl text-muted">
                Based on the information you provide, we&apos;ll suggest clinicians who may be suitable — you
                always stay in control of who you book with.
              </p>
            </div>
            <Link href="/doctors" className="hidden shrink-0 text-sm font-semibold text-brand hover:underline sm:block">
              See all doctors →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DOCTORS.slice(0, 3).map((doctor) => (
              <Card key={doctor.id} className="p-5">
                <div className="flex items-center gap-3">
                  <DoctorAvatar doctor={doctor} size={48} />
                  <div>
                    <p className="font-semibold text-slate-900">{doctor.name}</p>
                    <p className="text-sm text-muted">{doctor.specialty}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{doctor.bio}</p>
              </Card>
            ))}
          </div>
          <Link href="/doctors" className="mt-6 block text-sm font-semibold text-brand hover:underline sm:hidden">
            See all doctors →
          </Link>
        </Container>
      </section>

      <section className="py-16">
        <Container className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Ready to request an appointment?</h2>
          <p className="max-w-xl text-muted">
            It takes about 3–5 minutes. If your answers suggest a medical emergency, we&apos;ll tell you
            immediately and direct you to call 000.
          </p>
          <LinkButton href="/book" size="lg">
            Book an Appointment <ArrowRight size={18} aria-hidden="true" />
          </LinkButton>
        </Container>
      </section>
    </>
  );
}
