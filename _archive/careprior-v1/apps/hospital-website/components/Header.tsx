"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Button from "./Button";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/departments", label: "Departments" },
  { href: "/doctors", label: "Our Doctors" },
  { href: "/contact", label: "Contact" },
];

const PATIENT_PORTAL_URL = process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL || "http://localhost:3000";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-surface/95 backdrop-blur">
      <div className="bg-primary px-4 py-1.5 text-center text-xs text-white/90 md:px-6">
        In a medical emergency, call <strong>Triple Zero (000)</strong> — this is a demonstration site with synthetic data only.
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 focus-ring rounded-button">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect width="24" height="24" rx="6" fill="#0F5F5C" />
            <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="font-display text-lg font-bold text-text-primary">
            Hamilton&apos;s <span className="text-primary">Hospital</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring rounded-button text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-text-secondary hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href={`${PATIENT_PORTAL_URL}/login`}>
            <Button variant="secondary">Patient Login</Button>
          </a>
          <a href={`${PATIENT_PORTAL_URL}/login`}>
            <Button>Request Appointment</Button>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="focus-ring rounded-button p-2 md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="#162323" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`focus-ring rounded-button px-2 py-2 text-sm font-medium ${
                  pathname === item.href ? "bg-primary-light text-primary" : "text-text-secondary"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <a href={`${PATIENT_PORTAL_URL}/login`} className="mt-2">
              <Button className="w-full">Request Appointment</Button>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
