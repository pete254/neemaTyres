import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({
  connectionString: process.env.DIRECT_URL!,
});
const db = new PrismaClient({ adapter });

async function main() {
  const users = [
    { name: "Neema", email: "neema@kwambira.co.ke", password: "neema1234" },
    { name: "Staff", email: "staff@kwambira.co.ke", password: "staff1234" },
  ];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await db.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: { name: u.name, email: u.email, passwordHash },
    });
  }
  console.log("Seeded 2 users");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
