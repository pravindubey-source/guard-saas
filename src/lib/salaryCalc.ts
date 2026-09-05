import { prisma } from "@/lib/prisma";
import { daysInMonth } from "@/lib/month";

export type SalaryBreakdown = {
  guardId: string;
  guardName: string;
  designation: string;
  societies: string[];
  agreedSalary: number;
  totalDaysInMonth: number;
  presentDays: number;
  halfDays: number;
  leaveDays: number;
  weeklyOffDays: number;
  absentDays: number;
  unmarkedDays: number;
  payableDays: number;
  grossSalary: number;
  advanceDeducted: number;
  netPayable: number;
  pendingAdvanceIds: string[];
  alreadyGenerated: boolean;
};

// Every day is a working day in this business (confirmed with the user) — PRESENT and WEEKLY_OFF
// both count as a full payable day, HALF_DAY as half, LEAVE/ABSENT/no-record as unpaid.
export async function computeSalaryForGuardMonth(guardId: string, month: Date): Promise<SalaryBreakdown | null> {
  const guard = await prisma.guard.findUnique({
    where: { id: guardId },
    include: {
      designation: true,
      assignments: { where: { isActive: true }, include: { society: true } },
    },
  });
  if (!guard) return null;

  const totalDaysInMonth = daysInMonth(month);
  const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), totalDaysInMonth));

  const [attendance, advances, existingSlip] = await Promise.all([
    prisma.attendance.findMany({ where: { guardId, date: { gte: month, lte: monthEnd } } }),
    prisma.salaryAdvance.findMany({ where: { guardId, adjustmentMonth: month, salarySlipId: null } }),
    prisma.salarySlip.findUnique({ where: { guardId_month: { guardId, month } } }),
  ]);

  const statusByDate = new Map<string, string>();
  for (const a of attendance) {
    statusByDate.set(a.date.toISOString().slice(0, 10), a.status);
  }

  let presentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let weeklyOffDays = 0;
  let absentDays = 0;
  for (const status of statusByDate.values()) {
    if (status === "PRESENT") presentDays++;
    else if (status === "HALF_DAY") halfDays++;
    else if (status === "LEAVE") leaveDays++;
    else if (status === "WEEKLY_OFF") weeklyOffDays++;
    else if (status === "ABSENT") absentDays++;
  }
  const unmarkedDays = totalDaysInMonth - statusByDate.size;
  const payableDays = presentDays + halfDays * 0.5 + weeklyOffDays;

  const agreedSalary = Number(guard.actualSalary);
  const grossSalary = (agreedSalary * payableDays) / totalDaysInMonth;
  const advanceDeducted = advances.reduce((sum, a) => sum + Number(a.amount), 0);
  const netPayable = grossSalary - advanceDeducted;

  return {
    guardId: guard.id,
    guardName: guard.name,
    designation: guard.designation.name,
    societies: guard.assignments.map((a) => `${a.society.name} (${a.shiftType})`),
    agreedSalary,
    totalDaysInMonth,
    presentDays,
    halfDays,
    leaveDays,
    weeklyOffDays,
    absentDays,
    unmarkedDays,
    payableDays,
    grossSalary,
    advanceDeducted,
    netPayable,
    pendingAdvanceIds: advances.map((a) => a.id),
    alreadyGenerated: !!existingSlip,
  };
}
