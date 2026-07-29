"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, getFullName, getRole, getToken } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  reception: "Reception",
  nurse: "Nurse / Clinical Reviewer",
  manager: "Practice Manager",
  admin: "System Administrator",
  researcher: "Research Evaluator",
};

export default function AppShell({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const currentRole = getRole();
    if (!token || !currentRole || !allowedRoles.includes(currentRole)) {
      router.push("/login");
      return;
    }
    setRole(currentRole);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return <div className="p-8 text-text-secondary">Loading…</div>;
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 bg-bg-sidebar text-text-ondark md:flex md:flex-col">
        <div className="px-6 py-6">
          <p className="text-lg font-bold">CarePrior</p>
          <p className="text-xs text-white/60">AI-assisted intake. Human-led decisions.</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <Link href="/dashboard" className="focus-ring block rounded-button px-3 py-2 text-sm hover:bg-white/10">Review queue</Link>
          <Link href="/audit" className="focus-ring block rounded-button px-3 py-2 text-sm hover:bg-white/10">Audit explorer</Link>
        </nav>
        <div className="border-t border-white/10 px-6 py-4 text-xs">
          <p className="font-medium">{getFullName()}</p>
          <p className="text-white/60">{role ? ROLE_LABELS[role] : ""}</p>
          <button onClick={handleLogout} className="focus-ring mt-2 underline">Log out</button>
        </div>
      </aside>
      <main className="flex-1 bg-bg-main p-6 md:p-8">{children}</main>
    </div>
  );
}
