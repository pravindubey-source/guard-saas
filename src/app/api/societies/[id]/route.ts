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
  shiftHours: z.number().int().positive(),
  dayGuardsRequired: z.number().int().nonnegative(),
  nightGuardsRequired: z.number().int().nonnegative(),
  totalAgreedAmount: z.number().nonnegative(),
  withGST: z.boolean(),
  gstMode: z.enum(["COLLECTED_BY_US", "PAID_DIRECTLY_BY_SOCIETY"]).default("COLLECTED_BY_US"),
  gstPercentage: z.number().nonnegative(),
  // Designation-wise rate rows. Empty/omitted = flat-rate mode (the fields above are used as-is).
  lines: z.array(rateLineSchema).default([]),
});

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  contactPerson: z.string().min(1).optional(),
  contactPhone: z.string().min(1).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  gstNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  rateConfig: rateSchema.optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const society = await prisma.society.findUnique({
    where: { id: params.id },
    include: {
      rateConfig: { include: { lines: { include: { designation: true } } } },
      assignments: { where: { isActive: true }, include: { guard: { include: { designation: true } } } },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!society) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ society });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { rateConfig, contactEmail, ...rest } = parsed.data;

  const rateParts = rateConfig
    ? (() => {
        const { lines: rcLines, ...flatRate } = rateConfig;
        const mergedFlat = rcLines.length > 0 ? { ...flatRate, ...computeFlatFieldsFromLines(rcLines) } : flatRate;
        return { mergedFlat, lines: rcLines };
      })()
    : undefined;

  try {
    const society = await prisma.society.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(contactEmail !== undefined ? { contactEmail: contactEmail || null } : {}),
        ...(rateParts
          ? {
              rateConfig: {
                upsert: {
                  create: { ...rateParts.mergedFlat, lines: { create: rateParts.lines } },
                  update: { ...rateParts.mergedFlat, lines: { deleteMany: {}, create: rateParts.lines } },
                },
              },
            }
          : {}),
      },
      include: { rateConfig: { include: { lines: { include: { designation: true } } } } },
    });
    return NextResponse.json({ society });
  } catch {
    return NextResponse.json({ error: "Failed to update society" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.society.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete society. Remove related records first." }, { status: 500 });
  }
}
