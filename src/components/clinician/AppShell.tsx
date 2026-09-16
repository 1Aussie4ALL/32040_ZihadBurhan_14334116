import Link from "next/link";
import { LayoutDashboard, FlaskConical, LogOut, Stethoscope } from "lucide-react";
import { Container } from "@/components/common/Card";
import type { CurrentClinician } from "@/lib/auth/session";
import { logoutAction } from "@/app/clinician/actions";

export function AppShell({
  clinician,
  children,
}: {
  clinician: CurrentClinician | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-border-subtle bg-slate-900 text-white">
        <Container className="flex h-16 items-center justify-between">
          <Link href={clinician ? "/clinician/dashboard" : "/clinician/login"} className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
              <Stethoscope size={18} aria-hidden="true" />
            </span>
            <span>Meridian Health — Clinician Portal</span>
          </Link>

          {clinician && (
            <nav className="flex items-center gap-1 sm:gap-4" aria-label="Clinician navigation">
              <Link
                href="/clinician/dashboard"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                <LayoutDashboard size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/clinician/evaluation"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                <FlaskConical size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Evaluation</span>
              </Link>
              <span className="hidden text-sm text-slate-300 md:inline">{clinician.name}</span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </nav>
          )}
        </Container>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
