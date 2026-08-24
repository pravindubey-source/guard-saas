import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Ends an assignment (sets isActive=false, endDate=now) rather than hard delete,
// so historical billing/attendance records stay intact.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assignment = await prisma.assignment.update({
      where: { id: params.id },
      data: { isActive: false, endDate: new Date() },
    });
    return NextResponse.json({ assignment });
  } catch {
    return NextResponse.json({ error: "Failed to end assignment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.assignment.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
