import { prisma } from "@/lib/prisma";

export async function getCustomers() {
  return prisma.customer.findMany({ orderBy: { name: "asc" } });
}
