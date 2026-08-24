import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  rank: z.number().int().default(0),
});

export async function GET() {
  const designations = await prisma.designation.findMany({
    orderBy: [{ rank: "asc" }, { name: "asc" }],
    include: { _count: { select: { guards: true } } },
  });
  return NextResponse.json({ designations });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const designation = await prisma.designation.create({ data: parsed.data });
    return NextResponse.json({ designation }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Designation already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create designation" }, { status: 500 });
  }
}
