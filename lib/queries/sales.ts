import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface SaleDay {
  date: string;
  salesCount: number;
  cash: Decimal;
  mpesa: Decimal;
  debt: Decimal;
  revenue: Decimal;
  lines: Array<{
    saleId: string;
    saleDate: Date;
    customerName: string | null;
    variantLabel: string;
    qty: number;
    unitPrice: Decimal;
    lineTotal: Decimal;
  }>;
}

export interface SalesBetweenResult {
  from: Date;
  to: Date;
  totalRevenue: Decimal;
  totalCash: Decimal;
  totalMpesa: Decimal;
  totalDebt: Decimal;
  days: SaleDay[];
}

export async function getSalesBetween(
  from: Date,
  to: Date
): Promise<SalesBetweenResult> {
  const sales = await prisma.sale.findMany({
    where: { date: { gte: from, lte: to } },
    include: {
      payments: true,
      lines: {
        include: { variant: { include: { brand: true } } },
      },
      customer: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, typeof sales>();
  for (const sale of sales) {
    const day = sale.date.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(sale);
  }

  let totalCash = new Decimal(0);
  let totalMpesa = new Decimal(0);
  let totalDebt = new Decimal(0);

  const days: SaleDay[] = Array.from(byDay.entries()).map(
    ([date, daySales]) => {
      const cash = daySales
        .flatMap((s) => s.payments.filter((p) => p.channel === "CASH"))
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
      const mpesa = daySales
        .flatMap((s) => s.payments.filter((p) => p.channel === "MPESA"))
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
      const debt = daySales
        .flatMap((s) => s.payments.filter((p) => p.channel === "DEBT"))
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));

      totalCash = totalCash.plus(cash);
      totalMpesa = totalMpesa.plus(mpesa);
      totalDebt = totalDebt.plus(debt);

      const lines = daySales.flatMap((sale) =>
        sale.lines.map((line) => ({
          saleId: sale.id,
          saleDate: sale.date,
          customerName: sale.customer?.name ?? null,
          variantLabel: `${line.variant.sizeCanonical} ${line.variant.brand.name}${line.variant.subLabel ? ` ${line.variant.subLabel}` : ""}`.trim(),
          qty: line.qty,
          unitPrice: new Decimal(line.unitPrice.toString()),
          lineTotal: new Decimal(line.lineTotal.toString()),
        }))
      );

      return {
        date,
        salesCount: daySales.length,
        cash,
        mpesa,
        debt,
        revenue: cash.plus(mpesa).plus(debt),
        lines,
      };
    }
  );

  return {
    from,
    to,
    totalCash,
    totalMpesa,
    totalDebt,
    totalRevenue: totalCash.plus(totalMpesa).plus(totalDebt),
    days,
  };
}
