"use client";

import { useEffect, useState } from "react";

type TableData = { rows: any[]; totalCount: number };
type ExploreResponse = { tables: Record<string, TableData>; tableNames: string[]; generatedAt: string };

const TABLE_LABELS: Record<string, string> = {
  societies: "Societies",
  rateConfigs: "Rate Configs",
  designations: "Designations",
  guards: "Guards",
  assignments: "Assignments",
  attendance: "Attendance",
  invoices: "Invoices",
  users: "Users (logins)",
};

// Columns we never want to dump raw in a generic table view (too long / not useful)
const HIDE_KEYS = new Set(["passwordHash"]);

function formatValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") {
    if (v instanceof Date) return new Date(v).toLocaleString("en-IN");
    // Prisma Decimal / nested relation objects serialize as plain objects/strings over JSON
    if ("name" in v) return v.name;
    return JSON.stringify(v);
  }
  // ISO date strings
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleString("en-IN");
  }
  return String(v);
}

export default function DatabasePage() {
  const [data, setData] = useState<ExploreResponse | null>(null);
  const [activeTable, setActiveTable] = useState<string>("societies");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/explore");
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load database contents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeData = data?.tables?.[activeTable];
  const rows = activeData?.rows ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]).filter((k) => !HIDE_KEYS.has(k)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Explore Database</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Browse every stored record directly — useful for verifying data or debugging</p>
        </div>
        <button onClick={load} className="btn-secondary">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            {data.tableNames.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTable(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  activeTable === t ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {TABLE_LABELS[t] || t} <span className="opacity-70">({data.tables[t]?.totalCount ?? 0})</span>
              </button>
            ))}
          </div>

          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {columns.map((c) => (
                      <td key={c} className="max-w-xs truncate">
                        {formatValue(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(columns.length, 1)} className="text-center text-slate-400 dark:text-slate-500 py-8">
                      No records in this table yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing up to 200 most recent rows per table. Data refreshed at {new Date(data.generatedAt).toLocaleString("en-IN")}.
          </p>
        </>
      )}
    </div>
  );
}
