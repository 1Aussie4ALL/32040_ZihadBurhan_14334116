import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { Container } from "./Card";
import { Disclaimer } from "./Disclaimer";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-subtle bg-surface">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">Meridian Health Clinic</p>
          <p className="mt-2 text-sm text-muted">
            A private GP clinic (fictional demo). We collect meaningful information before your appointment so
            your clinician can be prepared and prioritise care appropriately.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Phone size={16} aria-hidden="true" /> (02) 5550 1234
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} aria-hidden="true" /> reception@meridianhealth.demo
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              Level 2, 128 Grafton St, Bondi Junction NSW 2022
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Links</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/services" className="hover:text-brand">Services</Link></li>
            <li><Link href="/doctors" className="hover:text-brand">Doctors</Link></li>
            <li><Link href="/about" className="hover:text-brand">About</Link></li>
            <li><Link href="/contact" className="hover:text-brand">Contact</Link></li>
            <li><Link href="/clinician/login" className="hover:text-brand">Clinician / reception login</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Important</p>
          <div className="mt-3">
            <Disclaimer variant="compact" />
          </div>
        </div>
      </Container>

      <div className="border-t border-border-subtle py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Meridian Health Clinic — academic prototype for a university Industry
        Project. Not a real clinic. Not for real patient use.
      </div>
    </footer>
  );
}
