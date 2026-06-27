import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface AgedDebtor {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalOutstanding: Decimal;
  current: Decimal;     // 0-30 days
  days31to60: Decimal;  // 31-60 days
  over60: Decimal;      // 60+ days
}

export interface AgedDebtorsResult {
  asOf: Date;
  debtors: AgedDebtor[];
  totals: {
    outstanding: Decimal;
    current: Decimal;
    days31to60: Decimal;
    over60: Decimal;
  };
}

export async function getDebtorsAged(asOf: Date): Promise<AgedDebtorsResult> {
  const customers = await prisma.customer.findMany({
    include: {
      sales: {
        where: {
          date: { lte: asOf },
          payments: { some: { channel: "DEBT" } },
        },
        include: { payments: { where: { channel: "DEBT" } } },
        orderBy: { date: "asc" },
      },
      debtCollections: {
        where: { date: { lte: asOf } },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  let totalOutstanding = new Decimal(0);
  let totalCurrent = new Decimal(0);
  let total3160 = new Decimal(0);
  let totalOver60 = new Decimal(0);

  const debtors: AgedDebtor[] = [];

  for (const customer of customers) {
    let remainingCollections = customer.debtCollections.reduce(
      (sum, dc) => sum.plus(dc.amount.toString()),
      new Decimal(0)
    );

    let outstanding = new Decimal(0);
    let current = new Decimal(0);
    let days31to60 = new Decimal(0);
    let over60 = new Decimal(0);

    for (const sale of customer.sales) {
      const debtAmount = sale.payments.reduce(
        (sum, p) => sum.plus(p.amount.toString()),
        new Decimal(0)
      );
      const applied = Decimal.min(debtAmount, remainingCollections);
      remainingCollections = remainingCollections.minus(applied);
      const balance = debtAmount.minus(applied);
      if (balance.lte(0)) continue;

      const daysOld = Math.floor(
        (asOf.getTime() - sale.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      outstanding = outstanding.plus(balance);

      if (daysOld <= 30) current = current.plus(balance);
      else if (daysOld <= 60) days31to60 = days31to60.plus(balance);
      else over60 = over60.plus(balance);
    }

    if (outstanding.lte(0)) continue;

    totalOutstanding = totalOutstanding.plus(outstanding);
    totalCurrent = totalCurrent.plus(current);
    total3160 = total3160.plus(days31to60);
    totalOver60 = totalOver60.plus(over60);

    debtors.push({
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      totalOutstanding: outstanding,
      current,
      days31to60,
      over60,
    });
  }

  return {
    asOf,
    debtors,
    totals: {
      outstanding: totalOutstanding,
      current: totalCurrent,
      days31to60: total3160,
      over60: totalOver60,
    },
  };
}
