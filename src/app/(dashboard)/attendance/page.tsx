"use client";

import { useEffect, useState } from "react";

type Society = { id: string; name: string };
type Assignment = { id: string; guard: { id: string; name: string; designation: { name: string } }; shiftType: string };
type AttendanceRecord = { guardId: string; status: string };

const STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEKLY_OFF"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [societyId, setSocietyId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((d) => {
        const active = (d.societies || []).filter((s: any) => s.isActive);
        setSocieties(active);
        if (active.length > 0) setSocietyId(active[0].id);
      });
  }, []);

  useEffect(() => {
    if (!societyId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/assignments?societyId=${societyId}`).then((r) => r.json()),
      fetch(`/api/attendance?societyId=${societyId}&date=${date}`).then((r) => r.json()),
    ]).then(([aData, attData]) => {
      setAssignments(aData.assignments || []);
      const map: Record<string, string> = {};
      (attData.attendance || []).forEach((a: any) => {
        map[a.guardId] = a.status;
      });
      // default to PRESENT for anyone not yet marked
      (aData.assignments || []).forEach((a: any) => {
        if (!map[a.guard.id]) map[a.guard.id] = "PRESENT";
      });
      setStatusMap(map);
      setLoading(false);
    });
  }, [societyId, date]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const entries = assignments.map((a) => ({
      guardId: a.guard.id,
      societyId,
      date,
      status: statusMap[a.guard.id] || "PRESENT",
      shiftType: a.shiftType,
    }));
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setSaving(false);
    setMessage(res.ok ? "Attendance saved successfully." : "Failed to save attendance.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Duty Attendance</h1>
        <p className="text-slate-500 text-sm">
          Log daily attendance for guards deployed at a society. Pick any past date to add or correct attendance
          retrospectively — future dates aren't allowed.
        </p>
      </div>

      <div className="card p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Society</label>
          <select className="input min-w-[220px]" value={societyId} onChange={(e) => setSocietyId(e.target.value)}>
            {societies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()} />
        </div>
        <button onClick={handleSave} disabled={saving || assignments.length === 0} className="btn-primary">
          {saving ? "Saving…" : "Save Attendance"}
        </button>
        {message && <span className="text-sm text-emerald-600">{message}</span>}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Guard</th>
              <th>Designation</th>
              <th>Shift</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              assignments.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.guard.name}</td>
                  <td>{a.guard.designation.name}</td>
                  <td>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700">{a.shiftType}</span>
                  </td>
                  <td>
                    <select
                      className="input max-w-[160px]"
                      value={statusMap[a.guard.id] || "PRESENT"}
                      onChange={(e) => setStatusMap({ ...statusMap, [a.guard.id]: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            {!loading && assignments.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-8">
                  No guards deployed at this society yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
