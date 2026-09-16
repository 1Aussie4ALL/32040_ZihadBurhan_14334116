import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "About Us — Hamilton's Hospital" };

const VALUES = [
  { title: "Patients first", detail: "Every decision starts with what's best for the person in front of us — not what's most convenient for the system." },
  { title: "Human-led care", detail: "Technology helps us listen and organise, but a qualified clinician always makes the call." },
  { title: "Transparency", detail: "We explain what we noticed and why, so patients and staff both understand the reasoning behind a recommendation." },
  { title: "Continuous improvement", detail: "We treat every case as a chance to make our intake and triage processes clearer and safer." },
];

const TIMELINE = [
  { year: "1989", event: "Hamilton's Hospital opens as a 40-bed community hospital." },
  { year: "2003", event: "Expansion adds Cardiology, Paediatrics, and Women's Health departments." },
  { year: "2015", event: "New Urgent Care Triage wing opens to reduce emergency wait times." },
  { year: "2026", event: "Launch of CarePrior, our AI-assisted, human-supervised intake platform." },
];

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="About Us"
        title="A community hospital, built around listening."
        description="Hamilton's Hospital has served the local community for over three decades. We combine experienced clinicians with thoughtful, human-supervised technology so every patient is heard and every request reaches the right person quickly."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary">Our story</h2>
            <p className="mt-3 text-text-secondary">
              Hamilton&apos;s Hospital started as a small community hospital with a simple goal: make sure people in
              the Hamilton&apos;s area could get the right care, from the right person, without unnecessary delay. That
              goal hasn&apos;t changed — but the way we meet it has evolved.
            </p>
            <p className="mt-3 text-text-secondary">
              Today we&apos;re a multi-department hospital supporting thousands of patients each year. In 2026, we
              introduced CarePrior, an AI-assisted intake system that helps our staff ask clearer follow-up
              questions and prioritise requests more consistently — while keeping every decision in the hands of a
              qualified human reviewer.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary">Our values</h2>
            <div className="mt-3 space-y-3">
              {VALUES.map((value) => (
                <div key={value.title} className="rounded-card border border-border bg-bg-surface p-4 shadow-sm">
                  <p className="font-semibold text-text-primary">{value.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{value.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <h2 className="font-display text-2xl font-bold text-text-primary">Our history</h2>
          <div className="mt-6 space-y-6 border-l-2 border-primary/30 pl-6">
            {TIMELINE.map((item) => (
              <div key={item.year} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-primary" />
                <p className="text-sm font-semibold text-primary">{item.year}</p>
                <p className="mt-1 text-text-secondary">{item.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="rounded-card border border-border bg-bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold text-text-primary">A note on this website</p>
          <p className="mt-2 text-sm text-text-secondary">
            Hamilton&apos;s Hospital is a fictional institution created for the 32040 Industry Project at the
            University of Technology Sydney. It exists to demonstrate a public-facing hospital website alongside
            the CarePrior patient portal and staff dashboard prototype. No real patients, staff, or medical records
            are represented here.
          </p>
        </div>
      </section>
    </main>
  );
}
