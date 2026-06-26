import { prisma } from "@/lib/prisma";

export async function getVariants() {
  return prisma.productVariant.findMany({
    include: { brand: true },
    orderBy: [{ sizeCanonical: "asc" }, { brand: { name: "asc" } }],
  });
}
