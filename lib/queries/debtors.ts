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
      openingBalanceEntries: {
        where: { kind: "DEBTOR" },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers
    .map((c) => {
      const openingDebt = c.openingBalanceEntries.reduce(
        (sum, e) => sum.plus(e.amount?.toString() ?? "0"),
        new Decimal(0)
      );
      const saleDebt = c.sales
        .flatMap((s) => s.payments)
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
      const totalCollected = c.debtCollections.reduce(
        (sum, dc) => sum.plus(dc.amount.toString()),
        new Decimal(0)
      );
      const outstanding = openingDebt.plus(saleDebt).minus(totalCollected);
      const oldestUnpaid = outstanding.gt(0)
        ? (c.openingBalanceEntries[0]?.asOfDate ??
            c.sales.find((s) => s.payments.some((p) => p.channel === "DEBT"))
              ?.date ??
            null)
        : null;
      return { ...c, outstanding, oldestUnpaid };
    })
    .filter((c) => c.outstanding.gt(0));
}
