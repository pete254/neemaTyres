import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function getDailyReport(from: Date, to: Date) {
  const sales = await prisma.sale.findMany({
    where: { date: { gte: from, lte: to } },
    include: {
      payments: true,
      lines: { include: { variant: { include: { brand: true } } } },
      customer: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Group by date
  const byDay = new Map<string, typeof sales>();
  for (const sale of sales) {
    const day = sale.date.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(sale);
  }

  return Array.from(byDay.entries()).map(([date, daySales]) => {
    const cash = daySales
      .flatMap((s) => s.payments.filter((p) => p.channel === "CASH"))
      .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
    const mpesa = daySales
      .flatMap((s) => s.payments.filter((p) => p.channel === "MPESA"))
      .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
    const debt = daySales
      .flatMap((s) => s.payments.filter((p) => p.channel === "DEBT"))
      .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
    const revenue = cash.plus(mpesa).plus(debt);
    return { date, sales: daySales, cash, mpesa, debt, revenue };
  });
}

export async function getReportSummary(from: Date, to: Date) {
  const [salesAgg, purchasesAgg, inventory] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: from, lte: to } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.purchase.aggregate({
      where: { date: { gte: from, lte: to } },
      _count: true,
    }),
    prisma.productVariant.findMany({
      select: { qtyOnHand: true, wacCost: true },
    }),
  ]);

  const stockValueAtWac = inventory.reduce(
    (sum, v) =>
      sum.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );

  return {
    totalRevenue: new Decimal(
      (salesAgg._sum.totalAmount ?? 0).toString()
    ),
    salesCount: salesAgg._count,
    purchasesCount: purchasesAgg._count,
    stockValueAtWac,
  };
}
