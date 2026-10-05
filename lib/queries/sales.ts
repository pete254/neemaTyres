import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface SaleLine {
  variantLabel: string;
  qty: number;
  unitPrice: Decimal;
  lineTotal: Decimal;
  unitCost: Decimal;
  grossProfit: Decimal;
}

export interface SaleGroup {
  saleId: string;
  invoiceNo: string | null;
  customerId: string | null;
  customerName: string | null;
  total: Decimal;
  channels: string;
  /** Sum of line totals (goods value) — the revenue base for profit. */
  salesValue: Decimal;
  cogs: Decimal;
  grossProfit: Decimal;
  lines: SaleLine[];
}

export interface SaleDay {
  date: string;
  salesCount: number;
  cash: Decimal;
  mpesa: Decimal;
  debt: Decimal;
  revenue: Decimal;
  grossProfit: Decimal;
  saleGroups: SaleGroup[];
  lines: Array<{
    saleId: string;
    saleDate: Date;
    customerName: string | null;
    variantLabel: string;
    qty: number;
    unitPrice: Decimal;
    lineTotal: Decimal;
    unitCost: Decimal;
    grossProfit: Decimal;
  }>;
}

export interface SalesBetweenResult {
  from: Date;
  to: Date;
  totalRevenue: Decimal;
  totalCash: Decimal;
  totalMpesa: Decimal;
  totalDebt: Decimal;
  totalGrossProfit: Decimal;
  days: SaleDay[];
}

export async function getSalesBetween(
  from: Date,
  to: Date,
  opts: { customerId?: string } = {}
): Promise<SalesBetweenResult> {
  const sales = await prisma.sale.findMany({
    where: {
      date: { gte: from, lte: to },
      ...(opts.customerId ? { customerId: opts.customerId } : {}),
    },
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
  let totalGrossProfit = new Decimal(0);

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
        sale.lines.map((line) => {
          const lineTotal = new Decimal(line.lineTotal.toString());
          const unitCost = new Decimal(line.unitCostAtSale.toString());
          return {
            saleId: sale.id,
            saleDate: sale.date,
            customerName: sale.customer?.name ?? null,
            variantLabel: `${line.variant.sizeCanonical} ${line.variant.brand.name}${line.variant.subLabel ? ` ${line.variant.subLabel}` : ""}`.trim(),
            qty: line.qty,
            unitPrice: new Decimal(line.unitPrice.toString()),
            lineTotal,
            unitCost,
            grossProfit: lineTotal.minus(unitCost.mul(line.qty)),
          };
        })
      );

      let dayGrossProfit = new Decimal(0);

      const saleGroups: SaleGroup[] = daySales.map((sale) => {
        const total = sale.payments.reduce(
          (sum, p) => sum.plus(p.amount.toString()),
          new Decimal(0)
        );
        const channels = [...new Set(sale.payments.map((p) => p.channel))].join(", ");

        const groupLines: SaleLine[] = sale.lines.map((line) => {
          const lineTotal = new Decimal(line.lineTotal.toString());
          const unitCost = new Decimal(line.unitCostAtSale.toString());
          return {
            variantLabel: `${line.variant.sizeCanonical} ${line.variant.brand.name}${line.variant.subLabel ? ` ${line.variant.subLabel}` : ""}`.trim(),
            qty: line.qty,
            unitPrice: new Decimal(line.unitPrice.toString()),
            lineTotal,
            unitCost,
            grossProfit: lineTotal.minus(unitCost.mul(line.qty)),
          };
        });

        const salesValue = groupLines.reduce(
          (sum, l) => sum.plus(l.lineTotal),
          new Decimal(0)
        );
        const cogs = groupLines.reduce(
          (sum, l) => sum.plus(l.unitCost.mul(l.qty)),
          new Decimal(0)
        );
        const grossProfit = salesValue.minus(cogs);
        dayGrossProfit = dayGrossProfit.plus(grossProfit);

        return {
          saleId: sale.id,
          invoiceNo: sale.invoiceNo ?? null,
          customerId: sale.customerId,
          customerName: sale.customer?.name ?? null,
          total,
          channels,
          salesValue,
          cogs,
          grossProfit,
          lines: groupLines,
        };
      });

      totalGrossProfit = totalGrossProfit.plus(dayGrossProfit);

      return {
        date,
        salesCount: daySales.length,
        cash,
        mpesa,
        debt,
        revenue: cash.plus(mpesa).plus(debt),
        grossProfit: dayGrossProfit,
        saleGroups,
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
    totalGrossProfit,
    days,
  };
}

/** Date of a customer's first sale, or null if they have none. */
export async function getCustomerFirstSaleDate(customerId: string) {
  const first = await prisma.sale.findFirst({
    where: { customerId },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  return first?.date ?? null;
}
