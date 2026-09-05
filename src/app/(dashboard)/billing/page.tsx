"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

type Society = { id: string; name: string; rateConfig: { withGST: boolean; gstPercentage: string; totalAgreedAmount: string } | null };
type Invoice = {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  guardsBilled: number;
  baseAmount: string;
  gstAmount: string;
  totalAmount: string;
  status: string;
  society: { name: string };
};

const STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ societyId: "", periodStart: firstOfMonth(), periodEnd: lastOfMonth(), notes: "" });

  async function load() {
    setLoading(true);
    const [iRes, sRes] = await Promise.all([fetch("/api/invoices"), fetch("/api/societies")]);
    const [iData, sData] = await Promise.all([iRes.json(), sRes.json()]);
    setInvoices(iData.invoices || []);
    setSocieties((sData.societies || []).filter((s: any) => s.isActive));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ societyId: societies[0]?.id || "", periodStart: firstOfMonth(), periodEnd: lastOfMonth(), notes: "" });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to generate invoice");
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const totalOutstanding = invoices
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + Number(i.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Billing / Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Generate invoices from agreed pricing, track payment status</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Generate Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">{inr(totalOutstanding)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Collected</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{inr(totalPaid)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Society</th>
              <th>Period</th>
              <th>Guards</th>
              <th>Base</th>
              <th>GST</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoiceNumber}</td>
                  <td>{inv.society.name}</td>
                  <td className="text-xs">
                    {new Date(inv.periodStart).toLocaleDateString("en-IN")} – {new Date(inv.periodEnd).toLocaleDateString("en-IN")}
                  </td>
                  <td>{inv.guardsBilled}</td>
                  <td>{inr(Number(inv.baseAmount))}</td>
                  <td>{inr(Number(inv.gstAmount))}</td>
                  <td className="font-medium">{inr(Number(inv.totalAmount))}</td>
                  <td>
                    <select
                      className="input py-1 text-xs max-w-[130px]"
                      value={inv.status}
                      onChange={(e) => updateStatus(inv.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <a href={`/billing/${inv.id}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-xs">
                      View / Print
                    </a>
                  </td>
                </tr>
              ))}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  No invoices generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generate Invoice">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Society *</label>
            <select required className="input" value={form.societyId} onChange={(e) => setForm({ ...form, societyId: e.target.value })}>
              <option value="">Select society…</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.rateConfig ? `(${s.rateConfig.withGST ? "GST " + s.rateConfig.gstPercentage + "%" : "No GST"})` : "(no pricing set)"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Period Start *</label>
              <input required type="date" className="input" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            </div>
            <div>
              <label className="label">Period End *</label>
              <input required type="date" className="input" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Amount is calculated automatically from the society's Total Agreed Amount and GST setting.
          </p>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Generating…" : "Generate Invoice"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
