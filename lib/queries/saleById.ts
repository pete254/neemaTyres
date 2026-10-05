import { prisma } from "@/lib/prisma";

export async function getSaleById(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, address: true, town: true, poBox: true } },
      lines: {
        include: {
          variant: {
            include: { brand: { select: { name: true } } },
          },
        },
      },
      payments: true,
      recordedBy: { select: { name: true } },
    },
  });
}

export type SaleDetail = Awaited<ReturnType<typeof getSaleById>>;

/** Several sales with the same shape as getSaleById, oldest first. */
export async function getSalesByIds(ids: string[]) {
  return prisma.sale.findMany({
    where: { id: { in: ids } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, address: true, town: true, poBox: true } },
      lines: {
        include: {
          variant: {
            include: { brand: { select: { name: true } } },
          },
        },
      },
      payments: true,
      recordedBy: { select: { name: true } },
    },
  });
}
