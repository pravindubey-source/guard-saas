import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseMonthInput } from "@/lib/month";

export const dynamic = "force-dynamic";

const schema = z.object({
  guardId: z.string().min(1),
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  adjustmentMonth: z.string().min(1), // "YYYY-MM"
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const guardId = searchParams.get("guardId") || undefined;
  const month = searchParams.get("adjustmentMonth") || undefined;

  const advances = await prisma.salaryAdvance.findMany({
    where: {
      ...(guardId ? { guardId } : {}),
      ...(month ? { adjustmentMonth: parseMonthInput(month) } : {}),
    },
    include: { guard: { select: { id: true, name: true, designation: { select: { name: true } } } } },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({
    advances: advances.map((a) => ({ ...a, status: a.salarySlipId ? "ADJUSTED" : "PENDING" })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { adjustmentMonth, paymentDate, notes, ...rest } = parsed.data;

  try {
    const advance = await prisma.salaryAdvance.create({
      data: {
        ...rest,
        paymentDate: new Date(paymentDate),
        adjustmentMonth: parseMonthInput(adjustmentMonth),
        notes: notes || null,
      },
      include: { guard: { select: { id: true, name: true, designation: { select: { name: true } } } } },
    });
    return NextResponse.json({ advance: { ...advance, status: "PENDING" } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record advance" }, { status: 500 });
  }
}
