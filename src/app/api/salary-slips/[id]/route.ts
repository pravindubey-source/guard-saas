import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["GENERATED", "PAID"]),
  paidOn: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const slip = await prisma.salarySlip.findUnique({
    where: { id: params.id },
    include: {
      guard: {
        include: {
          designation: true,
          assignments: { where: { isActive: true }, include: { society: true } },
        },
      },
      advances: true,
    },
  });
  if (!slip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ slip });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const slip = await prisma.salarySlip.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        paidOn: parsed.data.status === "PAID" ? new Date(parsed.data.paidOn || new Date().toISOString()) : null,
      },
      include: { guard: { select: { name: true } } },
    });
    return NextResponse.json({ slip });
  } catch {
    return NextResponse.json({ error: "Failed to update salary slip" }, { status: 500 });
  }
}

// Deleting a slip automatically reverts any advances it consumed back to "pending"
// (SalaryAdvance.salarySlipId has onDelete: SetNull), so it can be safely regenerated.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.salarySlip.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete salary slip" }, { status: 500 });
  }
}
