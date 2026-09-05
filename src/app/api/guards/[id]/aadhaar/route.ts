import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await prisma.guard.findUnique({
    where: { id: params.id },
    select: { aadharDocData: true, aadharDocFileName: true, aadharDocMimeType: true },
  });

  if (!guard?.aadharDocData || !guard.aadharDocMimeType) {
    return NextResponse.json({ error: "No Aadhaar document on file for this guard" }, { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "true";
  const fileName = guard.aadharDocFileName || "aadhaar";
  const buffer = Buffer.from(guard.aadharDocData, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": guard.aadharDocMimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName.replace(/"/g, "")}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
