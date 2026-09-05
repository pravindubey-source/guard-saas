import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { monthLabel } from "@/lib/month";
import PrintButton from "./PrintButton";

function inr2(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function SalarySlipPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const slip = await prisma.salarySlip.findUnique({
    where: { id: params.id },
    include: {
      guard: {
        include: {
          designation: true,
          assignments: { where: { isActive: true }, include: { society: true } },
        },
      },
    },
  });
  if (!slip) notFound();

  const { guard } = slip;
  const agreedSalary = Number(slip.agreedSalary);
  const payableDays = Number(slip.payableDays);
  const grossSalary = Number(slip.grossSalary);
  const advanceDeducted = Number(slip.advanceDeducted);
  const netPayable = Number(slip.netPayable);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto px-4 print:px-0">
        <div className="print:hidden mb-4 flex items-center justify-between">
          <a href="/salary" className="btn-secondary">
            ← Back to Salary
          </a>
          <PrintButton />
        </div>

        <div className="bg-white text-slate-900 rounded-xl shadow-sm print:shadow-none print:rounded-none p-10 print:p-8 border border-slate-200 print:border-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-red-600">{COMPANY.name} [Salary Slip]</h1>
            <img src={COMPANY.logoPath} alt={`${COMPANY.name} logo`} className="h-16 w-16 object-contain shrink-0" />
          </div>

          {/* Guard details */}
          <div className="grid grid-cols-2 gap-8 text-sm mb-8">
            <div className="space-y-1">
              <p className="font-semibold">{COMPANY.name}</p>
              {COMPANY.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>{COMPANY.phone}</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Guard Name</span>
                <span>{guard.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Designation</span>
                <span>{guard.designation.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Deployed At</span>
                <span className="text-right">
                  {guard.assignments.length > 0
                    ? guard.assignments.map((a) => `${a.society.name} (${a.shiftType})`).join(", ")
                    : "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Salary Month</span>
                <span>{monthLabel(slip.month)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown table */}
          <table className="w-full text-sm border border-slate-300 mb-6">
            <tbody>
              <tr className="bg-slate-100">
                <td className="px-3 py-2 border border-slate-300 font-medium">Agreed Monthly Salary</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{inr2(agreedSalary)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300">Total Days in Month</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{slip.totalDaysInMonth}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300">Present Days</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{slip.presentDays}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300">Half Days</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{slip.halfDays}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300">Weekly Off Days (paid)</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{slip.weeklyOffDays}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300">Leave Days (unpaid)</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{slip.leaveDays}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300">Absent Days</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{slip.absentDays}</td>
              </tr>
              {slip.unmarkedDays > 0 && (
                <tr>
                  <td className="px-3 py-2 border border-slate-300">Unmarked Days (unpaid)</td>
                  <td className="px-3 py-2 border border-slate-300 text-right">{slip.unmarkedDays}</td>
                </tr>
              )}
              <tr className="bg-slate-100">
                <td className="px-3 py-2 border border-slate-300 font-medium">Payable Days</td>
                <td className="px-3 py-2 border border-slate-300 text-right">
                  {payableDays} / {slip.totalDaysInMonth}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-slate-300 font-medium">Gross Salary (pro-rated)</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{inr2(grossSalary)}</td>
              </tr>
              {advanceDeducted > 0 && (
                <tr>
                  <td className="px-3 py-2 border border-slate-300 font-medium">Advance Deducted</td>
                  <td className="px-3 py-2 border border-slate-300 text-right text-amber-700">- {inr2(advanceDeducted)}</td>
                </tr>
              )}
              <tr className="bg-slate-200">
                <td className="px-3 py-2 border border-slate-300 font-bold text-base">Net Payable</td>
                <td className="px-3 py-2 border border-slate-300 text-right font-bold text-base">{inr2(netPayable)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between items-center text-sm">
            <span>
              Status:{" "}
              <span className={`font-semibold ${slip.status === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>
                {slip.status === "PAID" ? `Paid${slip.paidOn ? " on " + new Date(slip.paidOn).toLocaleDateString("en-IN") : ""}` : "Generated"}
              </span>
            </span>
            <span>Authorized Signature</span>
          </div>

          <div className="text-center text-sm mt-10">
            <p>Thank you</p>
          </div>
        </div>
      </div>
    </div>
  );
}
