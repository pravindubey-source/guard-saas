"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

type RateLine = {
  id?: string;
  designationId: string;
  designation?: { name: string };
  ratePerGuardMonthly: string;
  dayGuardsRequired: number;
  nightGuardsRequired: number;
};

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
    gstMode: "COLLECTED_BY_US" | "PAID_DIRECTLY_BY_SOCIETY";
    gstPercentage: string;
    lines: RateLine[];
  } | null;
  _count?: { assignments: number };
};

type Designation = { id: string; name: string };

type LineForm = { designationId: string; ratePerGuardMonthly: string; dayGuardsRequired: string; nightGuardsRequired: string };

function emptyLine(designationId: string): LineForm {
  return { designationId, ratePerGuardMonthly: "", dayGuardsRequired: "0", nightGuardsRequired: "0" };
}

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
  gstMode: "COLLECTED_BY_US" as "COLLECTED_BY_US" | "PAID_DIRECTLY_BY_SOCIETY",
  gstPercentage: "18",
};

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function SocietiesPage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [rateMode, setRateMode] = useState<"flat" | "designation">("flat");
  const [lines, setLines] = useState<LineForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [sRes, dRes] = await Promise.all([fetch("/api/societies"), fetch("/api/designations")]);
    const sData = await sRes.json();
    const dData = await dRes.json();
    setSocieties(sData.societies || []);
    setDesignations(dData.designations || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const linesTotal = lines.reduce((sum, l) => sum + Number(l.ratePerGuardMonthly || 0) * (Number(l.dayGuardsRequired || 0) + Number(l.nightGuardsRequired || 0)), 0);
  const linesDayTotal = lines.reduce((sum, l) => sum + Number(l.dayGuardsRequired || 0), 0);
  const linesNightTotal = lines.reduce((sum, l) => sum + Number(l.nightGuardsRequired || 0), 0);

  function addLine() {
    setLines((prev) => [...prev, emptyLine(designations[0]?.id || "")]);
  }
  function updateLine(index: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setRateMode("flat");
    setLines([]);
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
      gstMode: s.rateConfig?.gstMode || "COLLECTED_BY_US",
      gstPercentage: s.rateConfig?.gstPercentage || "18",
    });
    const existingLines = s.rateConfig?.lines || [];
    if (existingLines.length > 0) {
      setRateMode("designation");
      setLines(
        existingLines.map((l) => ({
          designationId: l.designationId,
          ratePerGuardMonthly: l.ratePerGuardMonthly,
          dayGuardsRequired: String(l.dayGuardsRequired),
          nightGuardsRequired: String(l.nightGuardsRequired),
        }))
      );
    } else {
      setRateMode("flat");
      setLines([]);
    }
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (rateMode === "designation" && lines.length === 0) {
      setError("Add at least one rate row, or switch back to Flat rate.");
      return;
    }
    if (rateMode === "designation" && lines.some((l) => !l.designationId || !l.ratePerGuardMonthly)) {
      setError("Every rate row needs a designation and a rate per guard.");
      return;
    }

    setSaving(true);

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
      rateConfig:
        rateMode === "designation"
          ? {
              ratePerGuardMonthly: 0,
              shiftHours: Number(form.shiftHours || 12),
              dayGuardsRequired: 0,
              nightGuardsRequired: 0,
              totalAgreedAmount: 0,
              withGST: form.withGST,
              gstMode: form.gstMode,
              gstPercentage: Number(form.gstPercentage || 0),
              lines: lines.map((l) => ({
                designationId: l.designationId,
                ratePerGuardMonthly: Number(l.ratePerGuardMonthly || 0),
                dayGuardsRequired: Number(l.dayGuardsRequired || 0),
                nightGuardsRequired: Number(l.nightGuardsRequired || 0),
              })),
            }
          : {
              ratePerGuardMonthly: Number(form.ratePerGuardMonthly || 0),
              shiftHours: Number(form.shiftHours || 12),
              dayGuardsRequired: Number(form.dayGuardsRequired || 0),
              nightGuardsRequired: Number(form.nightGuardsRequired || 0),
              totalAgreedAmount: Number(form.totalAgreedAmount || 0),
              withGST: form.withGST,
              gstMode: form.gstMode,
              gstPercentage: Number(form.gstPercentage || 0),
              lines: [],
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
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage client locations, billing details and agreed pricing</p>
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
                <td colSpan={9} className="text-center text-slate-400 dark:text-slate-500 py-8">
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
                    <div className="text-xs text-slate-400 dark:text-slate-500">{s.contactPhone}</div>
                  </td>
                  <td>
                    {s.rateConfig ? inr(Number(s.rateConfig.totalAgreedAmount)) : "—"}
                    {s.rateConfig && s.rateConfig.lines.length > 0 && (
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">by designation</span>
                    )}
                  </td>
                  <td>
                    {s.rateConfig?.withGST
                      ? `${s.rateConfig.gstPercentage}%${s.rateConfig.gstMode === "PAID_DIRECTLY_BY_SOCIETY" ? " (direct to govt)" : ""}`
                      : "No GST"}
                  </td>
                  <td className="text-xs">
                    {s.rateConfig ? `${s.rateConfig.dayGuardsRequired} day / ${s.rateConfig.nightGuardsRequired} night` : "—"}
                  </td>
                  <td>{s._count?.assignments ?? 0}</td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => openEdit(s)} className="text-brand-600 hover:underline text-xs mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDeactivate(s)} className="text-slate-500 dark:text-slate-400 hover:underline text-xs">
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && societies.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 dark:text-slate-500 py-8">
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

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setRateMode("flat")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  rateMode === "flat" ? "bg-brand-600 text-white border-brand-600" : "btn-secondary"
                }`}
              >
                Flat rate
              </button>
              <button
                type="button"
                onClick={() => {
                  setRateMode("designation");
                  if (lines.length === 0) setLines([emptyLine(designations[0]?.id || "")]);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                  rateMode === "designation" ? "bg-brand-600 text-white border-brand-600" : "btn-secondary"
                }`}
              >
                Designation-wise rates
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rateMode === "flat" && (
                <>
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
                </>
              )}

              {rateMode === "designation" && (
                <div className="col-span-2 space-y-3">
                  <div className="max-w-[160px]">
                    <label className="label">Shift Hours</label>
                    <input type="number" min="1" className="input" value={form.shiftHours} onChange={(e) => setForm({ ...form, shiftHours: e.target.value })} />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>Designation</th>
                          <th>Rate / Guard / Month (₹)</th>
                          <th>Day Guards</th>
                          <th>Night Guards</th>
                          <th>Row Amount</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l, i) => {
                          const rowAmount = Number(l.ratePerGuardMonthly || 0) * (Number(l.dayGuardsRequired || 0) + Number(l.nightGuardsRequired || 0));
                          return (
                            <tr key={i}>
                              <td>
                                <select className="input" value={l.designationId} onChange={(e) => updateLine(i, { designationId: e.target.value })}>
                                  <option value="">Select…</option>
                                  {designations.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input"
                                  value={l.ratePerGuardMonthly}
                                  onChange={(e) => updateLine(i, { ratePerGuardMonthly: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  className="input"
                                  value={l.dayGuardsRequired}
                                  onChange={(e) => updateLine(i, { dayGuardsRequired: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  className="input"
                                  value={l.nightGuardsRequired}
                                  onChange={(e) => updateLine(i, { nightGuardsRequired: e.target.value })}
                                />
                              </td>
                              <td className="whitespace-nowrap">{inr(rowAmount)}</td>
                              <td>
                                <button type="button" onClick={() => removeLine(i)} className="text-red-600 dark:text-red-400 text-xs hover:underline">
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {lines.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-400 dark:text-slate-500 py-4">
                              No rows yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <button type="button" onClick={addLine} className="btn-secondary text-sm">
                    + Add Row
                  </button>

                  <div className="text-sm bg-slate-50 dark:bg-slate-900 rounded-lg p-3 flex flex-wrap gap-x-6 gap-y-1">
                    <span>
                      Sanctioned: <strong>{linesDayTotal} day</strong> / <strong>{linesNightTotal} night</strong>
                    </span>
                    <span>
                      Total Agreed Amount: <strong>{inr(linesTotal)}</strong> / month
                    </span>
                  </div>
                </div>
              )}

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
              {form.withGST && (
                <div className="col-span-2">
                  <label className="label">GST Handling</label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="gstMode"
                        className="mt-1"
                        checked={form.gstMode === "COLLECTED_BY_US"}
                        onChange={() => setForm({ ...form, gstMode: "COLLECTED_BY_US" })}
                      />
                      <span>
                        <span className="font-medium">Collected by us</span> — GST is added to the bill and payable to us (default)
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="gstMode"
                        className="mt-1"
                        checked={form.gstMode === "PAID_DIRECTLY_BY_SOCIETY"}
                        onChange={() => setForm({ ...form, gstMode: "PAID_DIRECTLY_BY_SOCIETY" })}
                      />
                      <span>
                        <span className="font-medium">Paid directly to government by society</span> — GST is shown on the bill for
                        reference only and excluded from our collectable total
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
