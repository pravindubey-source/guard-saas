"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { monthLabel } from "@/lib/month";

type Guard = { id: string; name: string; designation: { name: string } };
type Advance = {
  id: string;
  amount: string;
  paymentDate: string;
  adjustmentMonth: string;
  notes: string | null;
  status: "PENDING" | "ADJUSTED";
  guard: { id: string; name: string; designation: { name: string } };
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const emptyForm = {
  guardId: "",
  amount: "",
  paymentDate: todayStr(),
  adjustmentMonth: currentMonthStr(),
  notes: "",
};

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [aRes, gRes] = await Promise.all([fetch("/api/salary-advances"), fetch("/api/guards?active=true&pageSize=500")]);
    const [aData, gData] = await Promise.all([aRes.json(), gRes.json()]);
    setAdvances(aData.advances || []);
    setGuards(gData.guards || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, guardId: guards[0]?.id || "" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(a: Advance) {
    setEditingId(a.id);
    setForm({
      guardId: a.guard.id,
      amount: a.amount,
      paymentDate: a.paymentDate.slice(0, 10),
      adjustmentMonth: a.adjustmentMonth.slice(0, 7),
      notes: a.notes || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      guardId: form.guardId,
      amount: Number(form.amount || 0),
      paymentDate: form.paymentDate,
      adjustmentMonth: form.adjustmentMonth,
      notes: form.notes || null,
    };
    const res = await fetch(editingId ? `/api/salary-advances/${editingId}` : "/api/salary-advances", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save advance.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(a: Advance) {
    if (!confirm(`Delete this ${inr(Number(a.amount))} advance for ${a.guard.name}?`)) return;
    const res = await fetch(`/api/salary-advances/${a.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "Failed to delete advance.");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Salary Advances</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Cash advances given to guards, adjusted against a future month's salary
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add Advance
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Guard</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Adjustment Month</th>
              <th>Notes</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              advances.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">
                    {a.guard.name}
                    <span className="block text-xs text-slate-400 dark:text-slate-500">{a.guard.designation.name}</span>
                  </td>
                  <td>{inr(Number(a.amount))}</td>
                  <td className="text-xs">{new Date(a.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td className="text-xs">{monthLabel(a.adjustmentMonth)}</td>
                  <td className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{a.notes || "—"}</td>
                  <td>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        a.status === "ADJUSTED"
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {a.status === "ADJUSTED" ? "Adjusted" : "Pending"}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {a.status === "PENDING" ? (
                      <>
                        <button onClick={() => openEdit(a)} className="text-brand-600 hover:underline text-xs mr-3">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(a)} className="text-red-500 dark:text-red-400 hover:underline text-xs">
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && advances.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  No advances recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Advance" : "Add Advance"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Guard *</label>
            <select required className="input" value={form.guardId} onChange={(e) => setForm({ ...form, guardId: e.target.value })}>
              <option value="">Select guard…</option>
              {guards.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.designation.name})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₹) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Payment Date *</label>
              <input
                required
                type="date"
                className="input"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Adjustment Month *</label>
            <input
              required
              type="month"
              className="input"
              value={form.adjustmentMonth}
              onChange={(e) => setForm({ ...form, adjustmentMonth: e.target.value })}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">The salary month this advance should be deducted from.</p>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Advance"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
