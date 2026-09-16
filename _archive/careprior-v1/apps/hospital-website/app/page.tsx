import Link from "next/link";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { DEPARTMENTS, DOCTORS } from "@/lib/data";

const PATIENT_PORTAL_URL = process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL || "http://localhost:3000";

const STATS = [
  { value: "35+", label: "Years serving Hamilton's" },
  { value: "8", label: "Clinical departments" },
  { value: "20,000+", label: "Patients cared for each year" },
  { value: "24/7", label: "Urgent intake triage" },
];

export default function HomePage() {
  return (
    <main>
      <section className="bg-gradient-to-b from-primary-light to-bg-main">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-6 md:py-24">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Hamilton&apos;s Hospital</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-text-primary md:text-5xl">
              Care that listens, <span className="text-primary">before it treats.</span>
            </h1>
            <p className="max-w-lg text-text-secondary">
              For over 35 years, Hamilton&apos;s Hospital has combined experienced clinicians with modern,
              human-supervised technology to make sure every patient is heard — and every request reaches the
              right person quickly.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={`${PATIENT_PORTAL_URL}/login`}>
                <Button>Request an Appointment</Button>
              </a>
              <Link href="/departments">
                <Button variant="secondary">Explore Departments</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-card border border-border bg-bg-surface p-6 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Not sure where to start?</p>
            <p className="mt-1 text-sm text-text-secondary">
              Describe how you feel in your own words. Our CarePrior intake system asks a few relevant follow-up
              questions and matches you with the right doctor — every recommendation is reviewed by a real staff
              member before anything happens.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                No jargon-filled forms
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                Matched to the right department and doctor
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                Urgent concerns flagged for immediate staff attention
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl font-bold text-primary md:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-text-secondary md:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Departments</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-text-primary">Care across every stage of life</h2>
          </div>
          <Link href="/departments" className="focus-ring hidden rounded-button text-sm font-semibold text-primary hover:underline md:block">
            View all departments &rarr;
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.slice(0, 4).map((dept) => (
            <Link
              key={dept.slug}
              href="/departments"
              className="focus-ring group rounded-card border border-border bg-bg-surface p-5 shadow-sm transition-colors hover:border-primary"
            >
              <div className="inline-flex rounded-button bg-primary-light p-2.5 text-primary">
                <Icon name={dept.icon} />
              </div>
              <p className="mt-3 font-semibold text-text-primary group-hover:text-primary">{dept.name}</p>
              <p className="mt-1 text-sm text-text-secondary">{dept.summary}</p>
            </Link>
          ))}
        </div>
        <Link href="/departments" className="focus-ring mt-6 block rounded-button text-sm font-semibold text-primary hover:underline md:hidden">
          View all departments &rarr;
        </Link>
      </section>

      <section className="bg-bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Our Doctors</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-text-primary">Meet a few of our clinicians</h2>
            </div>
            <Link href="/doctors" className="focus-ring hidden rounded-button text-sm font-semibold text-primary hover:underline md:block">
              Meet the full team &rarr;
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOCTORS.slice(0, 3).map((doc) => (
              <div key={doc.slug} className="rounded-card border border-border bg-bg-surface p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-light font-display text-sm font-bold text-secondary">
                  {doc.initials}
                </div>
                <p className="mt-3 font-semibold text-text-primary">{doc.name}</p>
                <p className="text-sm text-primary">{doc.role}</p>
                <p className="mt-2 text-sm text-text-secondary">{doc.bio}</p>
              </div>
            ))}
          </div>
          <Link href="/doctors" className="focus-ring mt-6 block rounded-button text-sm font-semibold text-primary hover:underline md:hidden">
            Meet the full team &rarr;
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="rounded-card bg-primary px-6 py-12 text-center text-white md:px-16">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Ready when you are.</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/85">
            Start a request in a few minutes. A member of our clinical staff reviews every submission before any
            action is taken.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={`${PATIENT_PORTAL_URL}/login`}>
              <Button variant="ondark">Request an Appointment</Button>
            </a>
            <Link href="/contact">
              <Button variant="outline-ondark">Contact Us</Button>
            </Link>
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-text-muted md:px-6">
        Hamilton&apos;s Hospital is a fictional institution created for the 32040 Industry Project — University
        of Technology Sydney. All content, staff, and data on this site are synthetic and for demonstration only.
      </p>
    </main>
  );
}
