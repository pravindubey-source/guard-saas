import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  guardId: z.string().min(1),
  societyId: z.string().min(1),
  shiftType: z.enum(["DAY", "NIGHT", "GENERAL", "ROTATIONAL"]).default("GENERAL"),
  startDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const societyId = searchParams.get("societyId") || undefined;
  const guardId = searchParams.get("guardId") || undefined;

  const assignments = await prisma.assignment.findMany({
    where: {
      isActive: true,
      ...(societyId ? { societyId } : {}),
      ...(guardId ? { guardId } : {}),
    },
    include: {
      guard: { include: { designation: true } },
      society: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { startDate, ...rest } = parsed.data;

  try {
    const assignment = await prisma.assignment.create({
      data: { ...rest, startDate: startDate ? new Date(startDate) : new Date() },
      include: { guard: { include: { designation: true } }, society: true },
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
