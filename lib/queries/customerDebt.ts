import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface CustomerDebtLine {
  saleId: string;
  date: Date;
  description: string;
  debtAmount: Decimal;
  collected: Decimal;
  outstanding: Decimal;
  daysOld: number;
}

export interface CustomerDebtResult {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalOutstanding: Decimal;
  totalDebt: Decimal;
  totalCollected: Decimal;
  lines: CustomerDebtLine[];
}

export async function getCustomerDebt(
  customerName: string
): Promise<CustomerDebtResult | null> {
  const customer = await prisma.customer.findFirst({
    where: { name: { contains: customerName, mode: "insensitive" } },
    include: {
      openingBalanceEntries: { where: { kind: "DEBTOR" } },
      sales: {
        include: { payments: { where: { channel: "DEBT" } } },
        where: { payments: { some: { channel: "DEBT" } } },
        orderBy: { date: "asc" },
      },
      debtCollections: { orderBy: { date: "asc" } },
    },
  });

  if (!customer) return null;

  const openingDebt = customer.openingBalanceEntries.reduce(
    (sum, e) => sum.plus(e.amount?.toString() ?? "0"),
    new Decimal(0)
  );
  const saleDebt = customer.sales
    .flatMap((s) => s.payments)
    .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
  const totalDebt = openingDebt.plus(saleDebt);

  const totalCollected = customer.debtCollections.reduce(
    (sum, dc) => sum.plus(dc.amount.toString()),
    new Decimal(0)
  );

  // FIFO: apply collections to oldest debts first.
  // Opening balance entries come before sales.
  let remainingCollections = totalCollected;
  const now = new Date();

  const openingLines: CustomerDebtLine[] = customer.openingBalanceEntries.map(
    (e) => {
      const date = e.asOfDate ?? e.createdAt;
      const debtAmount = new Decimal(e.amount?.toString() ?? "0");
      const applied = Decimal.min(debtAmount, remainingCollections);
      remainingCollections = remainingCollections.minus(applied);
      const outstanding = debtAmount.minus(applied);
      const daysOld = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        saleId: e.id,
        date,
        description: e.note ?? "Opening balance (carried forward)",
        debtAmount,
        collected: applied,
        outstanding,
        daysOld,
      };
    }
  );

  const saleLines: CustomerDebtLine[] = customer.sales.map((sale) => {
    const debtAmount = sale.payments.reduce(
      (sum, p) => sum.plus(p.amount.toString()),
      new Decimal(0)
    );
    const applied = Decimal.min(debtAmount, remainingCollections);
    remainingCollections = remainingCollections.minus(applied);
    const outstanding = debtAmount.minus(applied);
    const daysOld = Math.floor(
      (now.getTime() - sale.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      saleId: sale.id,
      date: sale.date,
      description: "Sale on credit",
      debtAmount,
      collected: applied,
      outstanding,
      daysOld,
    };
  });

  const lines = [...openingLines, ...saleLines].filter((l) =>
    l.outstanding.gt(0)
  );

  return {
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    totalDebt,
    totalCollected,
    totalOutstanding: totalDebt.minus(totalCollected),
    lines,
  };
}

export interface SaleBalance {
  saleId: string;
  invoiceNo: string | null;
  date: Date;
  total: Decimal;
  /** Portion of the sale put on credit. */
  debtAmount: Decimal;
  /** Paid at the time of sale (cash / M-Pesa) plus collections applied FIFO. */
  paid: Decimal;
  outstanding: Decimal;
  items: string;
}

/**
 * Per-sale balances for a customer's credit sales. Debt collections aren't
 * tied to a sale, so — as in getCustomerDebt — they are applied FIFO: opening
 * balances first, then sales oldest to newest.
 */
export async function getCustomerSaleBalances(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      openingBalanceEntries: { where: { kind: "DEBTOR" } },
      sales: {
        where: { payments: { some: { channel: "DEBT" } } },
        include: {
          payments: true,
          lines: { include: { variant: { include: { brand: { select: { name: true } } } } } },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      },
      debtCollections: true,
    },
  });
  if (!customer) return null;

  let remaining = customer.debtCollections.reduce(
    (sum, dc) => sum.plus(dc.amount.toString()),
    new Decimal(0)
  );
  for (const e of customer.openingBalanceEntries) {
    const applied = Decimal.min(new Decimal(e.amount?.toString() ?? "0"), remaining);
    remaining = remaining.minus(applied);
  }

  const sales: SaleBalance[] = customer.sales.map((sale) => {
    const total = new Decimal(sale.totalAmount.toString());
    const debtAmount = sale.payments
      .filter((p) => p.channel === "DEBT")
      .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
    const applied = Decimal.min(debtAmount, remaining);
    remaining = remaining.minus(applied);
    const outstanding = debtAmount.minus(applied);
    return {
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
      date: sale.date,
      total,
      debtAmount,
      paid: total.minus(outstanding),
      outstanding,
      items: sale.lines
        .map((l) => `${l.qty}× ${l.variant.sizeCanonical} ${l.variant.brand.name}${l.variant.subLabel ? ` ${l.variant.subLabel}` : ""}`)
        .join(", "),
    };
  });

  return { customer: { id: customer.id, name: customer.name, phone: customer.phone }, sales };
}
