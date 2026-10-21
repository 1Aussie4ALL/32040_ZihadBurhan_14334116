"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Stethoscope } from "lucide-react";
import clsx from "clsx";
import { Container } from "./Card";
import { LinkButton } from "./Button";
import { ViewSwitcher, rememberPatientPath } from "./ViewSwitcher";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/doctors", label: "Doctors" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => rememberPatientPath(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Stethoscope size={18} aria-hidden="true" />
          </span>
          <span className="text-lg">Meridian Health Clinic</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm font-medium transition-colors hover:text-brand",
                pathname === link.href ? "text-brand" : "text-slate-600",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ViewSwitcher current="patient" />
          <LinkButton href="/book" size="md">
            Book an Appointment
          </LinkButton>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-slate-700 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-border-subtle bg-surface md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <LinkButton href="/book" className="mt-2" onClick={() => setOpen(false)}>
              Book an Appointment
            </LinkButton>
            <ViewSwitcher current="patient" className="mt-2 self-start" />
          </Container>
        </div>
      )}
    </header>
  );
}
