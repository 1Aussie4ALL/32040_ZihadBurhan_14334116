import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { DOCTORS } from "@/lib/data";

export const metadata: Metadata = { title: "Our Doctors — Hamilton's Hospital" };

export default function DoctorsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Our Doctors"
        title="Meet the team."
        description="Experienced, approachable clinicians across every department — matched to you through CarePrior, or found directly below."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOCTORS.map((doc) => (
            <div key={doc.slug} className="rounded-card border border-border bg-bg-surface p-5 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-light font-display text-base font-bold text-secondary">
                {doc.initials}
              </div>
              <p className="mt-3 font-semibold text-text-primary">{doc.name}</p>
              <p className="text-sm text-primary">{doc.role}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">{doc.department}</p>
              <p className="mt-2 text-sm text-text-secondary">{doc.bio}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
