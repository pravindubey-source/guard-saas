import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// Visit this URL once after deploying, with ?key=YOUR_SETUP_SECRET, to create the
// first admin login and default designations — no terminal/commands required.
// It refuses to run again once an admin user already exists, so it's safe to leave in place.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (!process.env.SETUP_SECRET || key !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Invalid or missing setup key." }, { status: 401 });
  }

  const existingAdmin = await prisma.user.findFirst();
  if (existingAdmin) {
    return NextResponse.json({
      message: "Setup already completed. An admin user already exists. Go to /login to sign in.",
    });
  }

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@yourcompany.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { email, passwordHash, name, role: "ADMIN" } });

  const designations = [
    { name: "Security Guard", rank: 1 },
    { name: "Head Guard", rank: 2 },
    { name: "Supervisor", rank: 3 },
    { name: "Gunman", rank: 4 },
    { name: "Site Manager", rank: 5 },
  ];
  for (const d of designations) {
    await prisma.designation.upsert({ where: { name: d.name }, update: {}, create: d });
  }

  return NextResponse.json({
    message: "Setup complete! You can now log in.",
    loginEmail: email,
    loginPasswordHint: "Use the password you set in the SEED_ADMIN_PASSWORD environment variable.",
    loginUrl: "/login",
  });
}
