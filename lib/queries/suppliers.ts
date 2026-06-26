import { prisma } from "@/lib/prisma";

export async function getSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function getSupplierStatement(supplierId: string) {
  const [supplier, entries] = await Promise.all([
    prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } }),
    prisma.ledgerEntry.findMany({
      where: { supplierId },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
  ]);
  return { supplier, entries };
}
