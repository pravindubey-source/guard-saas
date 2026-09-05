import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeFlatFieldsFromLines } from "@/lib/rateConfig";

const rateLineSchema = z.object({
  designationId: z.string().min(1),
  ratePerGuardMonthly: z.number().nonnegative(),
  dayGuardsRequired: z.number().int().nonnegative().default(0),
  nightGuardsRequired: z.number().int().nonnegative().default(0),
});

const rateSchema = z.object({
  ratePerGuardMonthly: z.number().nonnegative(),
  shiftHours: z.number().int().positive().default(12),
  dayGuardsRequired: z.number().int().nonnegative().default(0),
  nightGuardsRequired: z.number().int().nonnegative().default(0),
  totalAgreedAmount: z.number().nonnegative(),
  withGST: z.boolean().default(true),
  gstMode: z.enum(["COLLECTED_BY_US", "PAID_DIRECTLY_BY_SOCIETY"]).default("COLLECTED_BY_US"),
  gstPercentage: z.number().nonnegative().default(18),
  // Designation-wise rate rows. Empty/omitted = flat-rate mode (the fields above are used as-is).
  lines: z.array(rateLineSchema).default([]),
});

export const dynamic = "force-dynamic";

const societySchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  contactPerson: z.string().min(1),
  contactPhone: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  gstNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  rateConfig: rateSchema,
});

export async function GET() {
  const societies = await prisma.society.findMany({
    include: {
      rateConfig: { include: { lines: { include: { designation: true } } } },
      _count: { select: { assignments: { where: { isActive: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ societies });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = societySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { rateConfig, contactEmail, ...rest } = parsed.data;
  const { lines, ...flatRate } = rateConfig;
  const mergedFlat = lines.length > 0 ? { ...flatRate, ...computeFlatFieldsFromLines(lines) } : flatRate;

  try {
    const society = await prisma.society.create({
      data: {
        ...rest,
        contactEmail: contactEmail || null,
        rateConfig: { create: { ...mergedFlat, lines: { create: lines } } },
      },
      include: { rateConfig: { include: { lines: { include: { designation: true } } } } },
    });
    return NextResponse.json({ society }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Society code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create society" }, { status: 500 });
  }
}
