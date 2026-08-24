import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  altPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  designationId: z.string().min(1),
  actualSalary: z.number().nonnegative(),
  joiningDate: z.string().optional(),
  aadharNumber: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const guards = await prisma.guard.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: {
      designation: true,
      assignments: { where: { isActive: true }, include: { society: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ guards });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { joiningDate, ...rest } = parsed.data;

  try {
    const guard = await prisma.guard.create({
      data: {
        ...rest,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      },
      include: { designation: true },
    });
    return NextResponse.json({ guard }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create guard" }, { status: 500 });
  }
}
