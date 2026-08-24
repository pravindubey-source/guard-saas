import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const entrySchema = z.object({
  guardId: z.string().min(1),
  societyId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEKLY_OFF"]),
  shiftType: z.enum(["DAY", "NIGHT", "GENERAL", "ROTATIONAL"]).default("GENERAL"),
  remarks: z.string().optional().nullable(),
});

const bulkSchema = z.object({ entries: z.array(entrySchema).min(1) });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const societyId = searchParams.get("societyId") || undefined;
  const date = searchParams.get("date") || undefined;
  const guardId = searchParams.get("guardId") || undefined;

  const attendance = await prisma.attendance.findMany({
    where: {
      ...(societyId ? { societyId } : {}),
      ...(guardId ? { guardId } : {}),
      ...(date ? { date: new Date(date) } : {}),
    },
    include: { guard: { include: { designation: true } }, society: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ attendance });
}

// Upserts one or many attendance entries for a given day (mark duty for a whole society at once)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const results = await prisma.$transaction(
      parsed.data.entries.map((e) =>
        prisma.attendance.upsert({
          where: {
            guardId_date_shiftType: {
              guardId: e.guardId,
              date: new Date(e.date),
              shiftType: e.shiftType,
            },
          },
          create: { ...e, date: new Date(e.date) },
          update: { status: e.status, remarks: e.remarks },
        })
      )
    );
    return NextResponse.json({ attendance: results }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
