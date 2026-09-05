"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/StatCard";

type Summary = {
  activeSocieties: number;
  totalGuards: number;
  totalDeployed: number;
  deployedDay: number;
  deployedNight: number;
  deployedOther: number;
  sanctionedDayTotal: number;
  sanctionedNightTotal: number;
  presentToday: number;
  absentToday: number;
  monthlyBillableRevenue: number;
  monthlyPayroll: number;
  estimatedMonthlyMargin: number;
  societyBreakdown: {
    id: string;
    name: string;
    daySanctioned: number;
    nightSanctioned: number;
    dayDeployed: number;
    nightDeployed: number;
    otherDeployed: number;
    totalDeployed: number;
    monthlyAmount: number;
    withGST: boolean;
  }[];
  recentInvoices: { id: string; invoiceNumber: string; totalAmount: string; status: string; society: { name: string } }[];
  societyId: string | null;
  generatedAt: string;
};

type SocietyOption = { id: string; name: string };

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [societies, setSocieties] = useState<SocietyOption[]>([]);
  const [societyFilter, setSocietyFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async (societyId: string) => {
    setLoading(true);
    setError("");
    try {
      const params = societyId ? `?societyId=${societyId}` : "";
      const res = await fetch(`/api/dashboard/summary${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((d) => setSocieties((d.societies || []).filter((s: any) => s.isActive).map((s: any) => ({ id: s.id, name: s.name }))));
  }, []);

  useEffect(() => {
    load(societyFilter);
  }, [load, societyFilter]);

  if (loading && !data) return <p className="text-slate-500 dark:text-slate-400">Loading dashboard…</p>;
  if (error && !data) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Operations Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {societyFilter ? `Overview for ${societies.find((s) => s.id === societyFilter)?.name || "selected society"}` : "Real-time overview of societies, manpower and billing"}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Society</label>
            <select className="input min-w-[200px]" value={societyFilter} onChange={(e) => setSocietyFilter(e.target.value)}>
              <option value="">All Societies</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button onClick={() => load(societyFilter)} disabled={loading} className="btn-secondary">
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            {lastRefreshed && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Last refreshed: {lastRefreshed.toLocaleTimeString("en-IN")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Societies" value={String(data.activeSocieties)} />
        <StatCard label="Total Manpower" value={String(data.totalGuards)} />
        <StatCard
          label="Currently Deployed"
          value={String(data.totalDeployed)}
          sub={`${data.deployedDay} day · ${data.deployedNight} night${data.deployedOther ? ` · ${data.deployedOther} other` : ""}`}
        />
        <StatCard label="Attendance Today" value={`${data.presentToday} present`} sub={`${data.absentToday} absent`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Monthly Billable (Client)" value={inr(data.monthlyBillableRevenue)} accent="text-brand-600" />
        <StatCard label="Monthly Payroll (Deployed)" value={inr(data.monthlyPayroll)} accent="text-slate-700 dark:text-slate-300" />
        <StatCard
          label="Estimated Monthly Margin"
          value={inr(data.estimatedMonthlyMargin)}
          accent={data.estimatedMonthlyMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Society-wise Deployment (Day / Night)</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Sanctioned total: {data.sanctionedDayTotal} day · {data.sanctionedNightTotal} night
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Society</th>
                <th>Day (sanctioned / deployed)</th>
                <th>Night (sanctioned / deployed)</th>
                <th>Monthly Amount</th>
                <th>GST</th>
              </tr>
            </thead>
            <tbody>
              {data.societyBreakdown.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td className={s.dayDeployed < s.daySanctioned ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                    {s.daySanctioned} / {s.dayDeployed}
                  </td>
                  <td className={s.nightDeployed < s.nightSanctioned ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                    {s.nightSanctioned} / {s.nightDeployed}
                  </td>
                  <td>{inr(s.monthlyAmount)}</td>
                  <td>{s.withGST ? "With GST" : "Without GST"}</td>
                </tr>
              ))}
              {data.societyBreakdown.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 dark:text-slate-500 py-6">
                    No active societies yet. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Invoices</h2>
          <Link href="/billing" className="text-sm text-brand-600 hover:underline">
            Generate an invoice →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Society</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoiceNumber}</td>
                  <td>{inv.society.name}</td>
                  <td>{inr(Number(inv.totalAmount))}</td>
                  <td>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800">{inv.status}</span>
                  </td>
                </tr>
              ))}
              {data.recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400 dark:text-slate-500 py-6">
                    No invoices generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold">Need to look at raw records?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Browse every table directly, including full history.</p>
        </div>
        <Link href="/database" className="btn-secondary">
          Explore Database →
        </Link>
      </div>
    </div>
  );
}
