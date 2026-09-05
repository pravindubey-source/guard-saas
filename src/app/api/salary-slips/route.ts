import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseMonthInput } from "@/lib/month";
import { computeSalaryForGuardMonth } from "@/lib/salaryCalc";

export const dynamic = "force-dynamic";

const schema = z.object({
  month: z.string().min(1),
  guardIds: z.array(z.string().min(1)).min(1),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const guardId = searchParams.get("guardId") || undefined;
  const monthParam = searchParams.get("month") || undefined;

  const slips = await prisma.salarySlip.findMany({
    where: {
      ...(guardId ? { guardId } : {}),
      ...(monthParam ? { month: parseMonthInput(monthParam) } : {}),
    },
    include: { guard: { select: { id: true, name: true, designation: { select: { name: true } } } } },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ slips });
}

// Recomputes the salary breakdown server-side for each requested guard (never trusts client-sent
// numbers) and saves it as an immutable slip. Guards that already have a slip for the month, or
// that don't exist, are skipped rather than failing the whole batch.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const month = parseMonthInput(parsed.data.month);
  const generated: string[] = [];
  const skipped: { guardId: string; reason: string }[] = [];

  for (const guardId of parsed.data.guardIds) {
    const breakdown = await computeSalaryForGuardMonth(guardId, month);
    if (!breakdown) {
      skipped.push({ guardId, reason: "Guard not found" });
      continue;
    }
    if (breakdown.alreadyGenerated) {
      skipped.push({ guardId, reason: "Already generated for this month" });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const slip = await tx.salarySlip.create({
          data: {
            guardId,
            month,
            agreedSalary: breakdown.agreedSalary,
            totalDaysInMonth: breakdown.totalDaysInMonth,
            presentDays: breakdown.presentDays,
            halfDays: breakdown.halfDays,
            leaveDays: breakdown.leaveDays,
            weeklyOffDays: breakdown.weeklyOffDays,
            absentDays: breakdown.absentDays,
            unmarkedDays: breakdown.unmarkedDays,
            payableDays: breakdown.payableDays,
            grossSalary: breakdown.grossSalary,
            advanceDeducted: breakdown.advanceDeducted,
            netPayable: breakdown.netPayable,
          },
        });
        if (breakdown.pendingAdvanceIds.length > 0) {
          await tx.salaryAdvance.updateMany({
            where: { id: { in: breakdown.pendingAdvanceIds } },
            data: { salarySlipId: slip.id },
          });
        }
      });
      generated.push(guardId);
    } catch {
      skipped.push({ guardId, reason: "Failed to generate" });
    }
  }

  return NextResponse.json({ generated, skipped });
}
