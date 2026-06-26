import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function getDebtors() {
  const customers = await prisma.customer.findMany({
    include: {
      sales: {
        include: { payments: { where: { channel: "DEBT" } } },
        orderBy: { date: "asc" },
      },
      debtCollections: true,
    },
    orderBy: { name: "asc" },
  });

  return customers
    .map((c) => {
      const totalDebt = c.sales
        .flatMap((s) => s.payments)
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
      const totalCollected = c.debtCollections.reduce(
        (sum, dc) => sum.plus(dc.amount.toString()),
        new Decimal(0)
      );
      const outstanding = totalDebt.minus(totalCollected);
      const oldestUnpaid =
        outstanding.gt(0)
          ? c.sales.find((s) =>
              s.payments.some((p) => p.channel === "DEBT")
            )?.date ?? null
          : null;
      return { ...c, outstanding, oldestUnpaid };
    })
    .filter((c) => c.outstanding.gt(0) || c.sales.length > 0);
}
