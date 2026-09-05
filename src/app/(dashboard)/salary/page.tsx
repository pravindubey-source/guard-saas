"use client";

import { useEffect, useState } from "react";

type Guard = { id: string; name: string; designation: { name: string } };
type PreviewRow = {
  guardId: string;
  guardName: string;
  designation: string;
  societies: string[];
  totalDaysInMonth: number;
  presentDays: number;
  halfDays: number;
  payableDays: number;
  grossSalary: number;
  advanceDeducted: number;
  netPayable: number;
  alreadyGenerated: boolean;
};
type Slip = {
  id: string;
  month: string;
  guard: { id: string; name: string; designation: { name: string } };
  grossSalary: string;
  advanceDeducted: string;
  netPayable: string;
  status: "GENERATED" | "PAID";
  paidOn: string | null;
};

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(value: string) {
  // value can be "YYYY-MM" (from the month input) or a full ISO date string (from the API)
  const [y, m] = value.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function SalaryPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [month, setMonth] = useState(currentMonthStr());
  const [guardId, setGuardId] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const [slips, setSlips] = useState<Slip[]>([]);
  const [historyMonth, setHistoryMonth] = useState("");
  const [historyGuardId, setHistoryGuardId] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    fetch("/api/guards?active=true&pageSize=500")
      .then((r) => r.json())
      .then((d) => setGuards((d.guards || []).map((g: any) => ({ id: g.id, name: g.name, designation: g.designation }))));
  }, []);

  async function loadPreview() {
    setPreviewLoading(true);
    setMessage("");
    const params = new URLSearchParams({ month });
    if (guardId) params.set("guardId", guardId);
    const res = await fetch(`/api/salary-slips/preview?${params.toString()}`);
    const data = await res.json();
    setRows(data.rows || []);
    setPreviewLoading(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const params = new URLSearchParams();
    if (historyMonth) params.set("month", historyMonth);
    if (historyGuardId) params.set("guardId", historyGuardId);
    const res = await fetch(`/api/salary-slips?${params.toString()}`);
    const data = await res.json();
    setSlips(data.slips || []);
    setHistoryLoading(false);
  }

  useEffect(() => {
    loadPreview();
  }, [month, guardId]);

  useEffect(() => {
    loadHistory();
  }, [historyMonth, historyGuardId]);

  async function handleGenerate() {
    const targetIds = rows.filter((r) => !r.alreadyGenerated).map((r) => r.guardId);
    if (targetIds.length === 0) {
      setMessage("Nothing to generate — every guard in this view already has a slip for this month.");
      return;
    }
    setGenerating(true);
    setMessage("");
    const res = await fetch("/api/salary-slips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, guardIds: targetIds }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setMessage("Failed to generate salary slips.");
      return;
    }
    setMessage(
      `Generated ${data.generated.length} slip${data.generated.length === 1 ? "" : "s"}` +
        (data.skipped.length ? `, skipped ${data.skipped.length}.` : ".")
    );
    loadPreview();
    loadHistory();
  }

  async function markPaid(slip: Slip) {
    const paidOn = prompt("Payment date (YYYY-MM-DD)?", new Date().toISOString().slice(0, 10));
    if (!paidOn) return;
    await fetch(`/api/salary-slips/${slip.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidOn }),
    });
    loadHistory();
  }

  async function deleteSlip(slip: Slip) {
    if (!confirm(`Delete the ${monthLabel(slip.month)} slip for ${slip.guard.name}? Any advances it deducted will return to pending.`))
      return;
    await fetch(`/api/salary-slips/${slip.id}`, { method: "DELETE" });
    loadHistory();
    loadPreview();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Salary Generation</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Generate monthly salary slips from agreed salary, attendance and pending advances
        </p>
      </div>

      <div className="card p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Month</label>
          <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="label">Guard</label>
          <select className="input min-w-[220px]" value={guardId} onChange={(e) => setGuardId(e.target.value)}>
            <option value="">All Guards</option>
            {guards.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.designation.name})
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating || previewLoading || rows.length === 0} className="btn-primary">
          {generating ? "Generating…" : "Generate Salary"}
        </button>
        {message && <span className="text-sm text-emerald-600 dark:text-emerald-400">{message}</span>}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Guard</th>
              <th>Designation</th>
              <th>Society</th>
              <th>Days Present</th>
              <th>Days Payable</th>
              <th>Gross Salary</th>
              <th>Advance Deducted</th>
              <th>Net Payable</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {previewLoading && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  Loading preview…
                </td>
              </tr>
            )}
            {!previewLoading &&
              rows.map((r) => (
                <tr key={r.guardId}>
                  <td className="font-medium">{r.guardName}</td>
                  <td>{r.designation}</td>
                  <td className="text-xs">{r.societies.length ? r.societies.join(", ") : "Unassigned"}</td>
                  <td>{r.presentDays}</td>
                  <td>
                    {r.payableDays} / {r.totalDaysInMonth}
                  </td>
                  <td>{inr(r.grossSalary)}</td>
                  <td className={r.advanceDeducted > 0 ? "text-amber-600 dark:text-amber-400" : ""}>
                    {r.advanceDeducted > 0 ? `- ${inr(r.advanceDeducted)}` : "—"}
                  </td>
                  <td className={`font-medium ${r.netPayable < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{inr(r.netPayable)}</td>
                  <td>
                    {r.alreadyGenerated && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        Already generated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            {!previewLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  No guards to preview for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold">Salary Slip History</h2>
          <div className="flex gap-3">
            <input type="month" className="input" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} />
            <select className="input min-w-[200px]" value={historyGuardId} onChange={(e) => setHistoryGuardId(e.target.value)}>
              <option value="">All Guards</option>
              {guards.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Guard</th>
                <th>Month</th>
                <th>Gross</th>
                <th>Advance</th>
                <th>Net Payable</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historyLoading && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 dark:text-slate-500 py-8">
                    Loading…
                  </td>
                </tr>
              )}
              {!historyLoading &&
                slips.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">
                      {s.guard.name}
                      <span className="block text-xs text-slate-400 dark:text-slate-500">{s.guard.designation.name}</span>
                    </td>
                    <td className="text-xs">{monthLabel(s.month)}</td>
                    <td>{inr(Number(s.grossSalary))}</td>
                    <td>{Number(s.advanceDeducted) > 0 ? inr(Number(s.advanceDeducted)) : "—"}</td>
                    <td className="font-medium">{inr(Number(s.netPayable))}</td>
                    <td>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                          s.status === "PAID"
                            ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {s.status === "PAID" ? `Paid${s.paidOn ? " " + new Date(s.paidOn).toLocaleDateString("en-IN") : ""}` : "Generated"}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <a href={`/salary/${s.id}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-xs mr-3">
                        View / Print
                      </a>
                      {s.status === "GENERATED" && (
                        <button onClick={() => markPaid(s)} className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs mr-3">
                          Mark Paid
                        </button>
                      )}
                      <button onClick={() => deleteSlip(s)} className="text-red-500 dark:text-red-400 hover:underline text-xs">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              {!historyLoading && slips.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 dark:text-slate-500 py-8">
                    No salary slips generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
