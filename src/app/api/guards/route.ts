import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ~5MB decoded file size, allowing for base64's ~4/3 size inflation
const MAX_AADHAR_BASE64_LENGTH = 7_000_000;
const AADHAR_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

const schema = z
  .object({
    name: z.string().min(1),
    phone: z.string().min(1),
    altPhone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    designationId: z.string().min(1),
    actualSalary: z.number().nonnegative(),
    joiningDate: z.string().optional(),
    aadharNumber: z.string().optional().nullable(),
    aadharDocData: z.string().max(MAX_AADHAR_BASE64_LENGTH, "File too large (max ~5MB)").optional().nullable(),
    aadharDocFileName: z.string().optional().nullable(),
    aadharDocMimeType: z.enum(AADHAR_MIME_TYPES).optional().nullable(),
  })
  .refine((d) => !d.aadharDocData || (d.aadharDocFileName && d.aadharDocMimeType), {
    message: "aadharDocFileName and aadharDocMimeType are required when uploading a file",
  });

// Excludes aadharDocData so listing many guards with uploaded files stays fast;
// use GET /api/guards/[id]/aadhaar to fetch the file itself.
const GUARD_LIST_SELECT = {
  id: true,
  name: true,
  phone: true,
  altPhone: true,
  address: true,
  designationId: true,
  designation: true,
  actualSalary: true,
  joiningDate: true,
  aadharNumber: true,
  aadharDocFileName: true,
  aadharDocMimeType: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  assignments: { where: { isActive: true }, include: { society: true } },
} as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";
  const search = searchParams.get("search")?.trim();
  const societyId = searchParams.get("societyId")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const where: any = {
    ...(activeOnly ? { isActive: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(societyId ? { assignments: { some: { isActive: true, societyId } } } : {}),
  };

  const [guards, total] = await Promise.all([
    prisma.guard.findMany({
      where,
      select: GUARD_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.guard.count({ where }),
  ]);

  return NextResponse.json({ guards, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
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
      select: GUARD_LIST_SELECT,
    });
    return NextResponse.json({ guard }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create guard" }, { status: 500 });
  }
}
