import Link from "next/link";

const COLUMNS = [
  {
    title: "Visit",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/departments", label: "Departments" },
      { href: "/doctors", label: "Our Doctors" },
      { href: "/contact", label: "Contact & Location" },
    ],
  },
  {
    title: "Patients",
    links: [
      { href: "/contact", label: "Visiting Hours" },
      { href: "/departments", label: "Our Services" },
      { href: "/doctors", label: "Find a Doctor" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-bg-sidebar text-text-ondark">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect width="24" height="24" rx="6" fill="#49A7A2" />
                <path d="M12 6v12M6 12h12" stroke="#0B2A29" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <span className="font-display text-base font-bold">Hamilton&apos;s Hospital</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-text-ondark/70">
              Compassionate, evidence-based care for the Hamilton&apos;s community — supported by CarePrior, our
              AI-assisted intake and triage platform.
            </p>
            <p className="mt-4 text-xs text-text-ondark/50">
              This is a fictional, dummy hospital website built for the 32040 Industry Project (University of
              Technology Sydney). No real patients, doctors, or services are represented.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-ondark/50">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="focus-ring rounded-button text-sm text-text-ondark/80 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-text-ondark/50 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Hamilton&apos;s Hospital. All rights reserved (not really — it&apos;s dummy data).</p>
          <p>123 Hamilton Street, Sydney NSW 2000 &middot; (02) 5550 1000 &middot; In an emergency, call 000</p>
        </div>
      </div>
    </footer>
  );
}
