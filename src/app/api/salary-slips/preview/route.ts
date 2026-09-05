import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMonthInput } from "@/lib/month";
import { computeSalaryForGuardMonth } from "@/lib/salaryCalc";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const guardId = searchParams.get("guardId") || undefined;
  if (!monthParam) return NextResponse.json({ error: "month is required" }, { status: 400 });

  const month = parseMonthInput(monthParam);

  const guardIds = guardId
    ? [guardId]
    : (await prisma.guard.findMany({ where: { isActive: true }, select: { id: true } })).map((g) => g.id);

  const rows = (await Promise.all(guardIds.map((id) => computeSalaryForGuardMonth(id, month)))).filter(
    (r): r is NonNullable<typeof r> => r !== null
  );

  return NextResponse.json({ rows });
}
