import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface DayBookResult {
  date: Date;
  summary: {
    salesRevenue: Decimal;
    purchasesTotal: Decimal;
    debtCollected: Decimal;
    suppliersPaid: Decimal;
    returnsValue: Decimal;
  };
  sales: Awaited<ReturnType<typeof fetchSales>>;
  purchases: Awaited<ReturnType<typeof fetchPurchases>>;
  debtCollections: Awaited<ReturnType<typeof fetchDebtCollections>>;
  supplierPayments: Awaited<ReturnType<typeof fetchSupplierPayments>>;
  returns: Awaited<ReturnType<typeof fetchReturns>>;
}

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function fetchSales(start: Date, end: Date) {
  return prisma.sale.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      lines: { include: { variant: { include: { brand: true } } } },
      payments: true,
      customer: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });
}

async function fetchPurchases(start: Date, end: Date) {
  return prisma.purchase.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      lines: { include: { variant: { include: { brand: true } } } },
      supplier: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });
}

async function fetchDebtCollections(start: Date, end: Date) {
  return prisma.debtCollection.findMany({
    where: { date: { gte: start, lte: end } },
    include: { customer: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
}

async function fetchSupplierPayments(start: Date, end: Date) {
  return prisma.supplierPayment.findMany({
    where: { date: { gte: start, lte: end } },
    include: { supplier: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
}

async function fetchReturns(start: Date, end: Date) {
  return prisma.return.findMany({
    where: { date: { gte: start, lte: end } },
    include: { variant: { include: { brand: true } } },
    orderBy: { date: "asc" },
  });
}

export async function getDayBook(date: Date): Promise<DayBookResult> {
  const { start, end } = dayBounds(date);

  const [sales, purchases, debtCollections, supplierPayments, returns] =
    await Promise.all([
      fetchSales(start, end),
      fetchPurchases(start, end),
      fetchDebtCollections(start, end),
      fetchSupplierPayments(start, end),
      fetchReturns(start, end),
    ]);

  const salesRevenue = sales
    .flatMap((s) => s.payments)
    .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));

  const purchasesTotal = purchases
    .flatMap((p) => p.lines)
    .reduce(
      (sum, l) =>
        sum.plus(new Decimal(l.unitCost.toString()).mul(l.qty)),
      new Decimal(0)
    );

  const debtCollected = debtCollections.reduce(
    (sum, dc) => sum.plus(dc.amount.toString()),
    new Decimal(0)
  );

  const suppliersPaid = supplierPayments.reduce(
    (sum, sp) => sum.plus(sp.amount.toString()),
    new Decimal(0)
  );

  const returnsValue = returns.reduce(
    (sum, r) =>
      sum.plus(new Decimal(r.unitValue.toString()).mul(r.qty)),
    new Decimal(0)
  );

  return {
    date: start,
    summary: {
      salesRevenue,
      purchasesTotal,
      debtCollected,
      suppliersPaid,
      returnsValue,
    },
    sales,
    purchases,
    debtCollections,
    supplierPayments,
    returns,
  };
}
