import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(12)
});
const env = schema.parse(process.env);
const prisma = new PrismaClient();

try {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.error(`Admin ${email} already exists. No changes made.`);
    process.exitCode = 1;
  } else {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await prisma.admin.create({ data: { email, passwordHash } });
    console.log(`Admin created: ${email}`);
  }
} finally {
  await prisma.$disconnect();
}
