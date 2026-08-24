"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

type Society = {
  id: string;
  name: string;
  code: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  billingAddress: string | null;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string | null;
  gstNumber: string | null;
  isActive: boolean;
  rateConfig: {
    ratePerGuardMonthly: string;
    shiftHours: number;
    dayGuardsRequired: number;
    nightGuardsRequired: number;
    totalAgreedAmount: string;
    withGST: boolean;
    gstPercentage: string;
  } | null;
  _count?: { assignments: number };
};

const emptyForm = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  billingAddress: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  gstNumber: "",
  notes: "",
  ratePerGuardMonthly: "",
  shiftHours: "12",
  dayGuardsRequired: "0",
  nightGuardsRequired: "0",
  totalAgreedAmount: "",
  withGST: true,
  gstPercentage: "18",
};

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/societies");
    const data = await res.json();
    setSocieties(data.societies || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(s: Society) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      code: s.code || "",
      address: s.address,
      city: s.city,
      state: s.state,
      pincode: s.pincode || "",
      billingAddress: s.billingAddress || "",
      contactPerson: s.contactPerson,
      contactPhone: s.contactPhone,
      contactEmail: s.contactEmail || "",
      gstNumber: s.gstNumber || "",
      notes: "",
      ratePerGuardMonthly: s.rateConfig?.ratePerGuardMonthly || "",
      shiftHours: String(s.rateConfig?.shiftHours ?? 12),
      dayGuardsRequired: String(s.rateConfig?.dayGuardsRequired ?? 0),
      nightGuardsRequired: String(s.rateConfig?.nightGuardsRequired ?? 0),
      totalAgreedAmount: s.rateConfig?.totalAgreedAmount || "",
      withGST: s.rateConfig?.withGST ?? true,
      gstPercentage: s.rateConfig?.gstPercentage || "18",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      code: form.code || null,
      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode || null,
      billingAddress: form.billingAddress || null,
      contactPerson: form.contactPerson,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail || null,
      gstNumber: form.gstNumber || null,
      notes: form.notes || null,
      rateConfig: {
        ratePerGuardMonthly: Number(form.ratePerGuardMonthly || 0),
        shiftHours: Number(form.shiftHours || 12),
        dayGuardsRequired: Number(form.dayGuardsRequired || 0),
        nightGuardsRequired: Number(form.nightGuardsRequired || 0),
        totalAgreedAmount: Number(form.totalAgreedAmount || 0),
        withGST: form.withGST,
        gstPercentage: Number(form.gstPercentage || 0),
      },
    };

    const res = await fetch(editingId ? `/api/societies/${editingId}` : "/api/societies", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to save society");
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleDeactivate(s: Society) {
    if (!confirm(`Mark "${s.name}" as inactive?`)) return;
    await fetch(`/api/societies/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Societies / Clients</h1>
          <p className="text-slate-500 text-sm">Manage client locations, billing details and agreed pricing</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add Society
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Contact</th>
              <th>Monthly Amount</th>
              <th>GST</th>
              <th>Day / Night</th>
              <th>Guards</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              societies.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td>{s.city}</td>
                  <td>
                    <div>{s.contactPerson}</div>
                    <div className="text-xs text-slate-400">{s.contactPhone}</div>
                  </td>
                  <td>{s.rateConfig ? inr(Number(s.rateConfig.totalAgreedAmount)) : "—"}</td>
                  <td>{s.rateConfig?.withGST ? `${s.rateConfig.gstPercentage}%` : "No GST"}</td>
                  <td className="text-xs">
                    {s.rateConfig ? `${s.rateConfig.dayGuardsRequired} day / ${s.rateConfig.nightGuardsRequired} night` : "—"}
                  </td>
                  <td>{s._count?.assignments ?? 0}</td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => openEdit(s)} className="text-brand-600 hover:underline text-xs mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDeactivate(s)} className="text-slate-500 hover:underline text-xs">
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && societies.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 py-8">
                  No societies yet. Click "Add Society" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Society" : "Add Society"} wide>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Society / Client Name *</label>
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Internal Code</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. GRV01" />
            </div>
            <div>
              <label className="label">GST Number (client)</label>
              <input className="input" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Site Address *</label>
              <textarea required className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">City *</label>
              <input required className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="label">State *</label>
              <input required className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Billing Address (if different)</label>
              <textarea className="input" rows={2} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact Person *</label>
              <input required className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact Phone *</label>
              <input required className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Contact Email</label>
              <input type="email" className="input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Pricing & Billing Setup</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Rate per Guard / Month (₹)</label>
                <input type="number" min="0" step="0.01" className="input" value={form.ratePerGuardMonthly} onChange={(e) => setForm({ ...form, ratePerGuardMonthly: e.target.value })} />
              </div>
              <div>
                <label className="label">Shift Hours</label>
                <input type="number" min="1" className="input" value={form.shiftHours} onChange={(e) => setForm({ ...form, shiftHours: e.target.value })} />
              </div>
              <div>
                <label className="label">Day Shift Guards (sanctioned)</label>
                <input type="number" min="0" className="input" value={form.dayGuardsRequired} onChange={(e) => setForm({ ...form, dayGuardsRequired: e.target.value })} />
              </div>
              <div>
                <label className="label">Night Shift Guards (sanctioned)</label>
                <input type="number" min="0" className="input" value={form.nightGuardsRequired} onChange={(e) => setForm({ ...form, nightGuardsRequired: e.target.value })} />
              </div>
              <div>
                <label className="label">Total Agreed Amount / Month (₹) *</label>
                <input required type="number" min="0" step="0.01" className="input" value={form.totalAgreedAmount} onChange={(e) => setForm({ ...form, totalAgreedAmount: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="withGST"
                  type="checkbox"
                  checked={form.withGST}
                  onChange={(e) => setForm({ ...form, withGST: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="withGST" className="text-sm font-medium">
                  With GST
                </label>
              </div>
              {form.withGST && (
                <div>
                  <label className="label">GST %</label>
                  <input type="number" min="0" step="0.01" className="input" value={form.gstPercentage} onChange={(e) => setForm({ ...form, gstPercentage: e.target.value })} />
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Society"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
