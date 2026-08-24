import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [societies, guards, activeAssignments, todayAttendance, invoices] = await Promise.all([
    prisma.society.findMany({ include: { rateConfig: true } }),
    prisma.guard.findMany({ where: { isActive: true }, include: { designation: true } }),
    prisma.assignment.findMany({ where: { isActive: true }, include: { guard: true, society: true } }),
    prisma.attendance.findMany({
      where: { date: new Date(new Date().toISOString().slice(0, 10)) },
    }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { society: true } }),
  ]);

  const activeSocieties = societies.filter((s) => s.isActive).length;
  const totalGuards = guards.length;
  const totalDeployed = activeAssignments.length;

  // Billing summary: sum of totalAgreedAmount across active societies
  const monthlyBillableRevenue = societies
    .filter((s) => s.isActive && s.rateConfig)
    .reduce((sum, s) => sum + Number(s.rateConfig!.totalAgreedAmount), 0);

  // Payroll: sum of actualSalary for currently-deployed guards
  const deployedGuardIds = new Set(activeAssignments.map((a) => a.guardId));
  const monthlyPayroll = guards
    .filter((g) => deployedGuardIds.has(g.id))
    .reduce((sum, g) => sum + Number(g.actualSalary), 0);

  const estimatedMonthlyMargin = monthlyBillableRevenue - monthlyPayroll;

  const presentToday = todayAttendance.filter((a) => a.status === "PRESENT").length;
  const absentToday = todayAttendance.filter((a) => a.status === "ABSENT").length;

  // Overall day/night deployed counts (a guard assigned with shiftType DAY/NIGHT counts there;
  // GENERAL/ROTATIONAL assignments are counted in "other" rather than forced into day or night)
  const deployedDay = activeAssignments.filter((a) => a.shiftType === "DAY").length;
  const deployedNight = activeAssignments.filter((a) => a.shiftType === "NIGHT").length;
  const deployedOther = activeAssignments.length - deployedDay - deployedNight;

  const sanctionedDayTotal = societies
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + (s.rateConfig?.dayGuardsRequired ?? 0), 0);
  const sanctionedNightTotal = societies
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + (s.rateConfig?.nightGuardsRequired ?? 0), 0);

  // Society-wise deployment vs sanctioned strength, split by day/night
  const societyBreakdown = societies
    .filter((s) => s.isActive)
    .map((s) => {
      const societyAssignments = activeAssignments.filter((a) => a.societyId === s.id);
      const dayDeployed = societyAssignments.filter((a) => a.shiftType === "DAY").length;
      const nightDeployed = societyAssignments.filter((a) => a.shiftType === "NIGHT").length;
      const otherDeployed = societyAssignments.length - dayDeployed - nightDeployed;
      return {
        id: s.id,
        name: s.name,
        daySanctioned: s.rateConfig?.dayGuardsRequired ?? 0,
        nightSanctioned: s.rateConfig?.nightGuardsRequired ?? 0,
        dayDeployed,
        nightDeployed,
        otherDeployed,
        totalDeployed: societyAssignments.length,
        monthlyAmount: s.rateConfig ? Number(s.rateConfig.totalAgreedAmount) : 0,
        withGST: s.rateConfig?.withGST ?? false,
      };
    });

  return NextResponse.json({
    activeSocieties,
    totalGuards,
    totalDeployed,
    deployedDay,
    deployedNight,
    deployedOther,
    sanctionedDayTotal,
    sanctionedNightTotal,
    presentToday,
    absentToday,
    monthlyBillableRevenue,
    monthlyPayroll,
    estimatedMonthlyMargin,
    societyBreakdown,
    recentInvoices: invoices,
    generatedAt: new Date().toISOString(),
  });
}
