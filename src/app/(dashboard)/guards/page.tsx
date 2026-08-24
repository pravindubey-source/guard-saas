"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

type Designation = { id: string; name: string; rank: number };
type Guard = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  designation: Designation;
  actualSalary: string;
  isActive: boolean;
  assignments: { society: { name: string }; shiftType: string }[];
};

const emptyForm = { name: "", phone: "", altPhone: "", address: "", designationId: "", actualSalary: "", aadharNumber: "" };

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function GuardsPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [desigModalOpen, setDesigModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newDesig, setNewDesig] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [gRes, dRes] = await Promise.all([fetch("/api/guards"), fetch("/api/designations")]);
    const gData = await gRes.json();
    const dData = await dRes.json();
    setGuards(gData.guards || []);
    setDesignations(dData.designations || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, designationId: designations[0]?.id || "" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(g: Guard) {
    setEditingId(g.id);
    setForm({
      name: g.name,
      phone: g.phone,
      altPhone: "",
      address: g.address || "",
      designationId: g.designation.id,
      actualSalary: g.actualSalary,
      aadharNumber: "",
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
      phone: form.phone,
      altPhone: form.altPhone || null,
      address: form.address || null,
      designationId: form.designationId,
      actualSalary: Number(form.actualSalary || 0),
      aadharNumber: form.aadharNumber || null,
    };
    const res = await fetch(editingId ? `/api/guards/${editingId}` : "/api/guards", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Failed to save guard. Please check the form.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleAddDesignation(e: React.FormEvent) {
    e.preventDefault();
    if (!newDesig.trim()) return;
    const res = await fetch("/api/designations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDesig.trim() }),
    });
    if (res.ok) {
      setNewDesig("");
      const dData = await (await fetch("/api/designations")).json();
      setDesignations(dData.designations || []);
    }
  }

  async function toggleActive(g: Guard) {
    await fetch(`/api/guards/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !g.isActive }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Manpower</h1>
          <p className="text-slate-500 text-sm">Guards, supervisors and their designations & salaries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDesigModalOpen(true)} className="btn-secondary">
            Manage Designations
          </button>
          <button onClick={openCreate} className="btn-primary">
            + Add Guard
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Phone</th>
              <th>Actual Salary</th>
              <th>Deployed At</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              guards.map((g) => (
                <tr key={g.id}>
                  <td className="font-medium">{g.name}</td>
                  <td>{g.designation?.name}</td>
                  <td>{g.phone}</td>
                  <td>{inr(Number(g.actualSalary))}</td>
                  <td className="text-xs">
                    {g.assignments.length > 0 ? (
                      g.assignments.map((a: any, i: number) => (
                        <span key={i}>
                          {a.society.name} ({a.shiftType}){i < g.assignments.length - 1 ? ", " : ""}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${g.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {g.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => openEdit(g)} className="text-brand-600 hover:underline text-xs mr-3">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(g)} className="text-slate-500 hover:underline text-xs">
                      {g.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && guards.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-8">
                  No manpower added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Guard" : "Add Guard"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone *</label>
              <input required className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Alt. Phone</label>
              <input className="input" value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Designation *</label>
              <select required className="input" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
                <option value="">Select…</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Actual Salary (₹/month) *</label>
              <input required type="number" min="0" step="0.01" className="input" value={form.actualSalary} onChange={(e) => setForm({ ...form, actualSalary: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Aadhar Number</label>
            <input className="input" value={form.aadharNumber} onChange={(e) => setForm({ ...form, aadharNumber: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Guard"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={desigModalOpen} onClose={() => setDesigModalOpen(false)} title="Manage Designations">
        <form onSubmit={handleAddDesignation} className="flex gap-2 mb-4">
          <input className="input" placeholder="e.g. Head Guard" value={newDesig} onChange={(e) => setNewDesig(e.target.value)} />
          <button type="submit" className="btn-primary shrink-0">
            Add
          </button>
        </form>
        <ul className="space-y-2">
          {designations.map((d) => (
            <li key={d.id} className="flex justify-between border-b border-slate-100 py-2 text-sm">
              <span>{d.name}</span>
            </li>
          ))}
          {designations.length === 0 && <p className="text-sm text-slate-400">No designations yet.</p>}
        </ul>
      </Modal>
    </div>
  );
}
