import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL = non-pooled Neon URL; prisma migrate uses this to bypass PgBouncer
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
