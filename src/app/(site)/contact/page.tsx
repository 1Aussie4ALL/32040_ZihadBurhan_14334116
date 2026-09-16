import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { ContactForm } from "@/components/common/ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold text-slate-900">Contact us</h1>
      <p className="mt-2 max-w-2xl text-muted">
        For general enquiries. For a medical emergency, call 000. To request an appointment, use{" "}
        <a href="/book" className="font-semibold text-brand hover:underline">
          Book an Appointment
        </a>
        .
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <Card className="h-fit space-y-4 p-6 text-sm">
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-brand" aria-hidden="true" />
            <span>(02) 5550 1234</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-brand" aria-hidden="true" />
            <span>reception@meridianhealth.demo</span>
          </div>
          <div className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            <span>Level 2, 128 Grafton St, Bondi Junction NSW 2022</span>
          </div>
          <div className="flex items-start gap-3">
            <Clock size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            <span>Mon–Fri 8am–6pm, Sat 9am–1pm</span>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <ContactForm />
        </Card>
      </div>
    </Container>
  );
}
