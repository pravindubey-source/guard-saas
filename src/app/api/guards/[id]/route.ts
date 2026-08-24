import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  altPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  designationId: z.string().min(1).optional(),
  actualSalary: z.number().nonnegative().optional(),
  aadharNumber: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await prisma.guard.findUnique({
    where: { id: params.id },
    include: {
      designation: true,
      assignments: { include: { society: true }, orderBy: { createdAt: "desc" } },
      attendance: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!guard) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ guard });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const guard = await prisma.guard.update({ where: { id: params.id }, data: parsed.data, include: { designation: true } });
    return NextResponse.json({ guard });
  } catch {
    return NextResponse.json({ error: "Failed to update guard" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.guard.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete guard. Remove related records first." }, { status: 500 });
  }
}
