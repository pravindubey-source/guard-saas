"use client";

import { useEffect, useState } from "react";

type Society = { id: string; name: string };
type Assignment = { id: string; guard: { id: string; name: string; designation: { name: string } }; shiftType: string };
type AttendanceRecord = { guardId: string; status: string; shiftType: string };
type GuardOption = { id: string; name: string };

const STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEKLY_OFF"];
const SHIFTS = ["DAY", "NIGHT", "GENERAL", "ROTATIONAL"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [societyId, setSocietyId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [shiftMap, setShiftMap] = useState<Record<string, string>>({});
  const [originalShiftMap, setOriginalShiftMap] = useState<Record<string, string>>({});
  const [editingShift, setEditingShift] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [allGuards, setAllGuards] = useState<GuardOption[]>([]);
  const [sheetGuardId, setSheetGuardId] = useState("");
  const [sheetStart, setSheetStart] = useState(firstOfMonthStr());
  const [sheetEnd, setSheetEnd] = useState(lastOfMonthStr());

  useEffect(() => {
    fetch("/api/societies")
      .then((r) => r.json())
      .then((d) => {
        const active = (d.societies || []).filter((s: any) => s.isActive);
        setSocieties(active);
        if (active.length > 0) setSocietyId(active[0].id);
      });
    fetch("/api/guards?pageSize=500")
      .then((r) => r.json())
      .then((d) => {
        const guards = (d.guards || []).map((g: any) => ({ id: g.id, name: g.name }));
        setAllGuards(guards);
        if (guards.length > 0) setSheetGuardId(guards[0].id);
      });
  }, []);

  function openAttendanceSheet() {
    if (!sheetGuardId) return;
    const params = new URLSearchParams({ start: sheetStart, end: sheetEnd });
    window.open(`/attendance/${sheetGuardId}?${params.toString()}`, "_blank");
  }

  function loadAttendance() {
    if (!societyId) return;
    setLoading(true);
    return Promise.all([
      fetch(`/api/assignments?societyId=${societyId}`).then((r) => r.json()),
      fetch(`/api/attendance?societyId=${societyId}&date=${date}`).then((r) => r.json()),
    ]).then(([aData, attData]) => {
      setAssignments(aData.assignments || []);
      const statuses: Record<string, string> = {};
      const savedShifts: Record<string, string> = {};
      (attData.attendance || []).forEach((a: AttendanceRecord) => {
        statuses[a.guardId] = a.status;
        savedShifts[a.guardId] = a.shiftType;
      });
      // default to PRESENT / the assignment's shift for anyone not yet marked
      (aData.assignments || []).forEach((a: Assignment) => {
        if (!statuses[a.guard.id]) statuses[a.guard.id] = "PRESENT";
      });
      const shifts: Record<string, string> = {};
      (aData.assignments || []).forEach((a: Assignment) => {
        shifts[a.guard.id] = savedShifts[a.guard.id] || a.shiftType;
      });
      setStatusMap(statuses);
      setShiftMap(shifts);
      setOriginalShiftMap(savedShifts);
      setEditingShift({});
      setLoading(false);
    });
  }

  useEffect(() => {
    loadAttendance();
  }, [societyId, date]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const entries = assignments.map((a) => {
      const shiftType = shiftMap[a.guard.id] || a.shiftType;
      const previousShiftType = originalShiftMap[a.guard.id];
      return {
        guardId: a.guard.id,
        societyId,
        date,
        status: statusMap[a.guard.id] || "PRESENT",
        shiftType,
        ...(previousShiftType && previousShiftType !== shiftType ? { previousShiftType } : {}),
      };
    });
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setSaving(false);
    setMessage(res.ok ? "Attendance saved successfully." : "Failed to save attendance.");
    if (res.ok) loadAttendance();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Duty Attendance</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
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
        {message && <span className="text-sm text-emerald-600 dark:text-emerald-400">{message}</span>}
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
                <td colSpan={4} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              assignments.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {a.guard.name}
                      {originalShiftMap[a.guard.id] && (
                        <span
                          title={`Attendance already recorded for ${date}`}
                          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        >
                          Already marked
                        </span>
                      )}
                    </span>
                  </td>
                  <td>{a.guard.designation.name}</td>
                  <td>
                    {editingShift[a.guard.id] ? (
                      <select
                        autoFocus
                        className="input max-w-[140px]"
                        value={shiftMap[a.guard.id] || a.shiftType}
                        onChange={(e) => setShiftMap({ ...shiftMap, [a.guard.id]: e.target.value })}
                        onBlur={() => setEditingShift({ ...editingShift, [a.guard.id]: false })}
                      >
                        {SHIFTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-100">
                          {shiftMap[a.guard.id] || a.shiftType}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingShift({ ...editingShift, [a.guard.id]: true })}
                          className="text-xs text-brand-600 dark:text-brand-100 hover:underline"
                        >
                          Edit
                        </button>
                      </span>
                    )}
                    {(shiftMap[a.guard.id] || a.shiftType) !== a.shiftType && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Default: {a.shiftType} (this date only)
                      </p>
                    )}
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
                <td colSpan={4} className="text-center text-slate-400 dark:text-slate-500 py-8">
                  No guards deployed at this society yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="font-medium mb-1">Individual Attendance Sheet</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Generate a printable attendance sheet for one guard. Defaults to the current month — pick a custom range if needed.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Guard</label>
            <select className="input min-w-[220px]" value={sheetGuardId} onChange={(e) => setSheetGuardId(e.target.value)}>
              {allGuards.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={sheetStart} onChange={(e) => setSheetStart(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={sheetEnd} onChange={(e) => setSheetEnd(e.target.value)} />
          </div>
          <button type="button" onClick={openAttendanceSheet} disabled={!sheetGuardId} className="btn-primary">
            Generate Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
