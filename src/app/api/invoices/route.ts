import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const genSchema = z.object({
  societyId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  guardsBilled: z.number().int().positive().optional(), // defaults to active assignment count
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const societyId = searchParams.get("societyId") || undefined;

  const invoices = await prisma.invoice.findMany({
    where: societyId ? { societyId } : undefined,
    include: { society: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = genSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { societyId, periodStart, periodEnd, notes } = parsed.data;

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    include: { rateConfig: true, assignments: { where: { isActive: true } } },
  });

  if (!society || !society.rateConfig) {
    return NextResponse.json({ error: "Society or rate configuration not found. Set up pricing first." }, { status: 400 });
  }

  const sanctionedTotal = society.rateConfig.dayGuardsRequired + society.rateConfig.nightGuardsRequired;
  const guardsBilled = parsed.data.guardsBilled ?? society.assignments.length ?? sanctionedTotal;

  // Prefer the fixed totalAgreedAmount from rate config as base; fall back to per-guard rate * guards billed
  const rate = society.rateConfig;
  const baseAmount = rate.totalAgreedAmount
    ? new Prisma.Decimal(rate.totalAgreedAmount)
    : new Prisma.Decimal(rate.ratePerGuardMonthly).mul(guardsBilled);

  const gstPercentage = rate.withGST ? new Prisma.Decimal(rate.gstPercentage) : new Prisma.Decimal(0);
  const gstAmount = baseAmount.mul(gstPercentage).div(100);
  // When GST is paid directly to the government by the society, it's shown on the invoice for
  // reference only and excluded from the amount we actually collect.
  const totalAmount = rate.gstMode === "PAID_DIRECTLY_BY_SOCIETY" ? baseAmount : baseAmount.plus(gstAmount);

  const invoiceCount = await prisma.invoice.count();
  const invoiceNumber = String(invoiceCount + 1).padStart(4, "0");

  try {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        societyId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        guardsBilled,
        baseAmount,
        gstPercentage,
        gstAmount,
        gstMode: rate.gstMode,
        totalAmount,
        notes: notes || null,
      },
      include: { society: true },
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
