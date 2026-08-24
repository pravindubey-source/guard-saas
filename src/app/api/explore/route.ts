import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TABLES = [
  "societies",
  "rateConfigs",
  "designations",
  "guards",
  "assignments",
  "attendance",
  "invoices",
  "users",
] as const;

// Read-only viewer over every table, capped to a reasonable row count per table so the
// page stays fast even as data grows. Requires a logged-in session (enforced by middleware),
// and never returns password hashes even for the users table.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedTable = searchParams.get("table");
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

  const [societies, rateConfigs, designations, guards, assignments, attendance, invoices, users] = await Promise.all([
    prisma.society.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.rateConfig.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { society: { select: { name: true } } } }),
    prisma.designation.findMany({ orderBy: { rank: "asc" }, take: limit }),
    prisma.guard.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { designation: { select: { name: true } } } }),
    prisma.assignment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { guard: { select: { name: true } }, society: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      orderBy: { date: "desc" },
      take: limit,
      include: { guard: { select: { name: true } }, society: { select: { name: true } } },
    }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { society: { select: { name: true } } } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } }),
  ]);

  const [
    societyCount,
    rateConfigCount,
    designationCount,
    guardCount,
    assignmentCount,
    attendanceCount,
    invoiceCount,
    userCount,
  ] = await Promise.all([
    prisma.society.count(),
    prisma.rateConfig.count(),
    prisma.designation.count(),
    prisma.guard.count(),
    prisma.assignment.count(),
    prisma.attendance.count(),
    prisma.invoice.count(),
    prisma.user.count(),
  ]);

  const tables = {
    societies: { rows: societies, totalCount: societyCount },
    rateConfigs: { rows: rateConfigs, totalCount: rateConfigCount },
    designations: { rows: designations, totalCount: designationCount },
    guards: { rows: guards, totalCount: guardCount },
    assignments: { rows: assignments, totalCount: assignmentCount },
    attendance: { rows: attendance, totalCount: attendanceCount },
    invoices: { rows: invoices, totalCount: invoiceCount },
    users: { rows: users, totalCount: userCount },
  };

  if (requestedTable && TABLES.includes(requestedTable as (typeof TABLES)[number])) {
    return NextResponse.json({ table: requestedTable, ...tables[requestedTable as keyof typeof tables] });
  }

  return NextResponse.json({ tables, tableNames: TABLES, generatedAt: new Date().toISOString() });
}
