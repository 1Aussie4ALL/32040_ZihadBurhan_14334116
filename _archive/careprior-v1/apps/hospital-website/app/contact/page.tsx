import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact Us — Hamilton's Hospital" };

const HOURS = [
  { day: "Monday – Friday", time: "7:00 am – 8:00 pm" },
  { day: "Saturday", time: "8:00 am – 5:00 pm" },
  { day: "Sunday", time: "9:00 am – 2:00 pm" },
  { day: "Urgent Care Triage", time: "24 hours / 7 days" },
];

export default function ContactPage() {
  return (
    <main>
      <PageHero
        eyebrow="Contact & Location"
        title="Get in touch."
        description="Reach out for general enquiries, or head straight to the patient portal to request an appointment."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">Send us a message</h2>
            <div className="mt-4 rounded-card border border-border bg-bg-surface p-6 shadow-sm">
              <ContactForm />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-text-primary">Location</h2>
              <p className="mt-2 text-sm text-text-secondary">123 Hamilton Street<br />Sydney NSW 2000, Australia</p>
              <div className="mt-4 flex h-40 items-center justify-center rounded-input border border-dashed border-border bg-bg-secondary text-xs text-text-muted">
                Map placeholder — demo site only
              </div>
            </div>

            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-text-primary">Contact details</h2>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                <li><span className="font-medium text-text-primary">Reception:</span> (02) 5550 1000</li>
                <li><span className="font-medium text-text-primary">Email:</span> reception@hamiltonshospital.example</li>
                <li><span className="font-medium text-text-primary">Emergency:</span> Call 000</li>
              </ul>
            </div>

            <div className="rounded-card border border-border bg-bg-surface p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-text-primary">Opening hours</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {HOURS.map((h) => (
                  <li key={h.day} className="flex justify-between text-text-secondary">
                    <span>{h.day}</span>
                    <span className="font-medium text-text-primary">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
