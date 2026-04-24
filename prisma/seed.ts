import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const envPath = (() => {
  const cwd = process.cwd();
  const localPath = path.join(cwd, "apps", "backend", ".env.local");
  if (fs.existsSync(localPath)) return localPath;
  const defaultPath = path.join(cwd, "apps", "backend", ".env");
  if (fs.existsSync(defaultPath)) return defaultPath;
  return undefined;
})();
if (envPath) dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  const orgName = process.env.SEED_ORG_NAME ?? "ООО «Компания»";
  const orgSlug = process.env.SEED_ORG_SLUG ?? "company";
  const email = process.env.SEED_EMAIL ?? "lawyer@company.local";
  const fullName = process.env.SEED_FULL_NAME ?? "Юрист";
  const password = process.env.SEED_PASSWORD ?? "lawyer12345";

  const passwordHash = await bcrypt.hash(password, 10);

  const organization = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName },
    create: { name: orgName, slug: orgSlug, description: "Организация по умолчанию для MVP." },
  });

  await prisma.user.upsert({
    where: { email },
    update: { fullName, isActive: true, role: UserRole.lawyer, organizationId: organization.id },
    create: {
      organizationId: organization.id,
      fullName,
      email,
      passwordHash,
      role: UserRole.lawyer,
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed completed: lawyer account only.");
  // eslint-disable-next-line no-console
  console.log(`Login: ${email} / ${password}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

