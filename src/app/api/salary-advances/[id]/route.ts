import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseMonthInput } from "@/lib/month";

export const dynamic = "force-dynamic";

const schema = z.object({
  guardId: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  paymentDate: z.string().min(1).optional(),
  adjustmentMonth: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.salaryAdvance.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.salarySlipId) {
    return NextResponse.json(
      { error: "This advance has already been adjusted in a generated salary slip. Delete or regenerate that slip first." },
      { status: 409 }
    );
  }

  const { adjustmentMonth, paymentDate, ...rest } = parsed.data;

  try {
    const advance = await prisma.salaryAdvance.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(paymentDate ? { paymentDate: new Date(paymentDate) } : {}),
        ...(adjustmentMonth ? { adjustmentMonth: parseMonthInput(adjustmentMonth) } : {}),
      },
      include: { guard: { select: { id: true, name: true, designation: { select: { name: true } } } } },
    });
    return NextResponse.json({ advance: { ...advance, status: "PENDING" } });
  } catch {
    return NextResponse.json({ error: "Failed to update advance" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.salaryAdvance.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.salarySlipId) {
    return NextResponse.json(
      { error: "This advance has already been adjusted in a generated salary slip. Delete or regenerate that slip first." },
      { status: 409 }
    );
  }

  try {
    await prisma.salaryAdvance.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete advance" }, { status: 500 });
  }
}
