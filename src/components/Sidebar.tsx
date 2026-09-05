"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import { COMPANY } from "@/lib/company";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/societies", label: "Societies", icon: "🏢" },
  { href: "/guards", label: "Manpower", icon: "🛡️" },
  { href: "/assignments", label: "Assignments", icon: "🔗" },
  { href: "/attendance", label: "Attendance", icon: "🗓️" },
  { href: "/billing", label: "Billing / Invoices", icon: "🧾" },
  { href: "/database", label: "Explore Database", icon: "🗄️" },
];

export default function Sidebar({ user }: { user: SessionPayload }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer automatically whenever the route changes (e.g. after tapping a nav link)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar with menu button - hidden on desktop where the sidebar is always visible */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-brand-900 text-white flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-xl leading-none"
        >
          ☰
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <img src={COMPANY.logoPath} alt={`${COMPANY.name} logo`} className="h-7 w-7 rounded-full shrink-0 bg-white object-contain" />
          <span className="font-semibold text-xs truncate">{COMPANY.name}</span>
        </div>
        <span className="w-9" />
      </div>

      {/* Dimmed backdrop behind the drawer on mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-screen w-64 shrink-0 bg-brand-900 text-white flex flex-col z-50 transition-transform duration-200 ease-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img src={COMPANY.logoPath} alt={`${COMPANY.name} logo`} className="h-10 w-10 rounded-full shrink-0 bg-white object-contain" />
            <div className="min-w-0">
              <p className="font-semibold leading-tight text-sm">{COMPANY.name}</p>
              <p className="text-xs text-brand-100/70">Operations Console</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-brand-600 text-white" : "text-brand-100/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          <div>
            <p className="text-xs text-brand-100/60 mb-1">Signed in as</p>
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-brand-100/60 truncate mb-3">{user.email}</p>
          </div>
          <ThemeToggle />
          <button onClick={handleLogout} className="w-full text-sm bg-white/10 hover:bg-white/20 rounded-lg py-2 transition">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
