import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@yourcompany.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name, role: "ADMIN" },
  });
  console.log(`Admin user ready: ${admin.email}`);

  const designations = [
    { name: "Security Guard", rank: 1 },
    { name: "Head Guard", rank: 2 },
    { name: "Supervisor", rank: 3 },
    { name: "Gunman", rank: 4 },
    { name: "Site Manager", rank: 5 },
  ];

  for (const d of designations) {
    await prisma.designation.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
  }
  console.log(`Seeded ${designations.length} default designations.`);
  console.log("\nLogin with:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("\n IMPORTANT: change this password after first login (or re-seed with new env vars).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
