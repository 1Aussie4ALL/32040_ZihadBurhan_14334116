import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { DEPARTMENTS } from "@/lib/data";

export const metadata: Metadata = { title: "Departments — Hamilton's Hospital" };

const PATIENT_PORTAL_URL = process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL || "http://localhost:3000";

export default function DepartmentsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Departments"
        title="Care across every stage of life."
        description="From everyday check-ups to specialist and urgent care, our departments work together so you're matched with the right team quickly."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.slug} id={dept.slug} className="rounded-card border border-border bg-bg-surface p-5 shadow-sm">
              <div className="inline-flex rounded-button bg-primary-light p-2.5 text-primary">
                <Icon name={dept.icon} />
              </div>
              <p className="mt-3 font-semibold text-text-primary">{dept.name}</p>
              <p className="mt-1 text-sm text-text-secondary">{dept.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="rounded-card bg-primary px-6 py-10 text-center text-white md:px-16">
          <h2 className="font-display text-2xl font-bold">Not sure which department you need?</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/85">
            Describe how you feel and CarePrior will match you with the right department and doctor — a staff
            member reviews every request before anything happens.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={`${PATIENT_PORTAL_URL}/login`}>
              <Button variant="ondark">Start a Request</Button>
            </a>
            <Link href="/doctors">
              <Button variant="outline-ondark">Meet Our Doctors</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
