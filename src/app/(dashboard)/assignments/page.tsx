"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

type Assignment = {
  id: string;
  shiftType: string;
  startDate: string;
  guard: { id: string; name: string; designation: { name: string } };
  society: { id: string; name: string };
};
type Guard = { id: string; name: string; designation: { name: string } };
type Society = { id: string; name: string };

const SHIFTS = ["DAY", "NIGHT", "GENERAL", "ROTATIONAL"];

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ guardId: "", societyId: "", shiftType: "GENERAL" });
  const [filterSociety, setFilterSociety] = useState("");

  async function load() {
    setLoading(true);
    const [aRes, gRes, sRes] = await Promise.all([
      fetch("/api/assignments"),
      fetch("/api/guards?active=true"),
      fetch("/api/societies"),
    ]);
    const [aData, gData, sData] = await Promise.all([aRes.json(), gRes.json(), sRes.json()]);
    setAssignments(aData.assignments || []);
    setGuards(gData.guards || []);
    setSocieties((sData.societies || []).filter((s: any) => s.isActive));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ guardId: "", societyId: societies[0]?.id || "", shiftType: "GENERAL" });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError("Failed to create assignment.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function endAssignment(id: string) {
    if (!confirm("End this assignment?")) return;
    await fetch(`/api/assignments/${id}`, { method: "PUT" });
    load();
  }

  const filtered = filterSociety ? assignments.filter((a) => a.society.id === filterSociety) : assignments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Deployment Assignments</h1>
          <p className="text-slate-500 text-sm">Map manpower to society locations and shifts</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + New Assignment
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-500">Filter by society:</label>
        <select className="input max-w-xs" value={filterSociety} onChange={(e) => setFilterSociety(e.target.value)}>
          <option value="">All societies</option>
          {societies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Guard</th>
              <th>Designation</th>
              <th>Society</th>
              <th>Shift</th>
              <th>Since</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.guard.name}</td>
                  <td>{a.guard.designation.name}</td>
                  <td>{a.society.name}</td>
                  <td>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700">{a.shiftType}</span>
                  </td>
                  <td className="text-xs">{new Date(a.startDate).toLocaleDateString("en-IN")}</td>
                  <td className="text-right">
                    <button onClick={() => endAssignment(a.id)} className="text-red-500 hover:underline text-xs">
                      End
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-8">
                  No active assignments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Assignment">
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
          <div>
            <label className="label">Society *</label>
            <select required className="input" value={form.societyId} onChange={(e) => setForm({ ...form, societyId: e.target.value })}>
              <option value="">Select society…</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Shift Type *</label>
            <select required className="input" value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value })}>
              {SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Create Assignment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
