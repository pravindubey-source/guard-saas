import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import PrintButton from "./PrintButton";

const STATUS_CODE: Record<string, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "HD",
  LEAVE: "L",
  WEEKLY_OFF: "WO",
};

function firstOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}
function lastOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0));
}
function parseDateParam(v: string | undefined, fallback: Date) {
  if (!v) return fallback;
  const d = new Date(`${v}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? fallback : d;
}
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function isoDay(d: Date) {
  return d.getUTCDate();
}

export default async function AttendanceSheetPage({
  params,
  searchParams,
}: {
  params: { guardId: string };
  searchParams: { start?: string; end?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const guard = await prisma.guard.findUnique({
    where: { id: params.guardId },
    include: {
      designation: true,
      assignments: { where: { isActive: true }, include: { society: true } },
    },
  });
  if (!guard) notFound();

  const start = parseDateParam(searchParams.start, firstOfMonth());
  const end = parseDateParam(searchParams.end, lastOfMonth());

  const attendance = await prisma.attendance.findMany({
    where: { guardId: guard.id, date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }, { shiftType: "asc" }],
  });

  const byDate = new Map<string, typeof attendance>();
  for (const a of attendance) {
    const key = fmtDate(a.date);
    const list = byDate.get(key) || [];
    list.push(a);
    byDate.set(key, list);
  }

  const days: Date[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }
  const mid = Math.ceil(days.length / 2);
  const leftDays = days.slice(0, mid);
  const rightDays = days.slice(mid);

  const totalPresent = attendance.filter((a) => a.status === "PRESENT" || a.status === "HALF_DAY").length;

  const periodLabel = `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString(
    "en-IN",
    { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }
  )}`;

  function renderTable(dayList: Date[], showTotal: boolean) {
    return (
      <table className="w-full text-sm border border-slate-400">
        <thead>
          <tr className="bg-slate-200">
            <th rowSpan={2} className="border border-slate-400 px-2 py-1 align-middle">
              Date
            </th>
            <th colSpan={2} className="border border-slate-400 px-2 py-1">
              Present or Absent
            </th>
            <th rowSpan={2} className="border border-slate-400 px-2 py-1 align-middle">
              Advance
            </th>
            <th rowSpan={2} className="border border-slate-400 px-2 py-1 align-middle">
              Remarks
            </th>
          </tr>
          <tr className="bg-slate-200">
            <th className="border border-slate-400 px-2 py-1 w-10">I</th>
            <th className="border border-slate-400 px-2 py-1 w-10">II</th>
          </tr>
        </thead>
        <tbody>
          {dayList.map((d) => {
            const records = byDate.get(fmtDate(d)) || [];
            const [first, second] = records;
            return (
              <tr key={fmtDate(d)}>
                <td className="border border-slate-400 px-2 py-1 text-center">{isoDay(d)}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{first ? STATUS_CODE[first.status] : ""}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{second ? STATUS_CODE[second.status] : ""}</td>
                <td className="border border-slate-400 px-2 py-1"></td>
                <td className="border border-slate-400 px-2 py-1 text-xs">{first?.remarks || ""}</td>
              </tr>
            );
          })}
          {showTotal && (
            <tr>
              <td colSpan={3} className="border border-slate-400 px-2 py-1 text-right font-semibold">
                Total
              </td>
              <td colSpan={2} className="border border-slate-400 px-2 py-1 font-semibold">
                {totalPresent}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4 print:px-0">
        <div className="print:hidden mb-4 flex items-center justify-between">
          <a href="/attendance" className="btn-secondary">
            ← Back to Attendance
          </a>
          <PrintButton />
        </div>

        <div className="bg-white text-slate-900 rounded-xl shadow-sm print:shadow-none print:rounded-none p-8 border border-slate-200 print:border-0">
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <h1 className="text-xl font-bold">Attendance Sheet</h1>
            <p className="text-sm mt-1">
              <span className="font-semibold">{guard.name}</span> — {guard.designation.name}
              {guard.phone ? ` · ${guard.phone}` : ""}
            </p>
            {guard.assignments.length > 0 && (
              <p className="text-sm text-slate-600">
                Deployed at: {guard.assignments.map((a) => `${a.society.name} (${a.shiftType})`).join(", ")}
              </p>
            )}
            <p className="text-sm text-slate-600">Period: {periodLabel}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {renderTable(leftDays, rightDays.length === 0)}
            {rightDays.length > 0 && renderTable(rightDays, true)}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            P = Present, A = Absent, HD = Half Day, L = Leave, WO = Weekly Off
          </p>
        </div>
      </div>
    </div>
  );
}
