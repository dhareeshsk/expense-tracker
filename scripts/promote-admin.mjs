// Promotes an existing user to SUPER_ADMIN by email. There's no self-serve
// signup path for admins by design - this is the only way to grant the role.
//
// Usage: node scripts/promote-admin.mjs someone@example.com
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `No account found for ${email}. They need to sign up first, then re-run this script.`,
    );
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: "SUPER_ADMIN" },
  });

  console.log(`${updated.email} is now SUPER_ADMIN.`);
} finally {
  await prisma.$disconnect();
}
