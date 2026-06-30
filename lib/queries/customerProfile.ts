import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface CustomerSaleLine {
  saleId: string;
  date: Date;
  items: string; // e.g. "2× RS AP 22.5 + 1× LL DIFF 20"
  total: Decimal;
  channels: string; // e.g. "CASH KES 45,000 · DEBT KES 10,000"
}

export interface CustomerProfileResult {
  id: string;
  name: string;
  phone: string | null;
  createdAt: Date;
  totalSpent: Decimal;
  visitCount: number;
  outstandingDebt: Decimal;
  sales: CustomerSaleLine[];
}

export async function getCustomerProfile(
  id: string,
  from?: Date,
  to?: Date
): Promise<CustomerProfileResult | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      openingBalanceEntries: { where: { kind: "DEBTOR" } },
      debtCollections: { orderBy: { date: "asc" } },
      sales: {
        where: {
          date: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        },
        include: {
          lines: {
            include: {
              variant: {
                include: { brand: { select: { name: true } } },
              },
            },
          },
          payments: true,
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!customer) return null;

  const fmt = (n: Decimal | number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(n));

  const totalSpent = customer.sales.reduce(
    (sum, s) =>
      sum.plus(
        s.lines.reduce((ls, l) => ls.plus(l.lineTotal.toString()), new Decimal(0))
      ),
    new Decimal(0)
  );

  const sales: CustomerSaleLine[] = customer.sales.map((s) => {
    const saleTotal = s.lines.reduce(
      (sum, l) => sum.plus(l.lineTotal.toString()),
      new Decimal(0)
    );

    const items = s.lines
      .map((l) => {
        const label = `${l.variant.sizeCanonical} ${l.variant.brand.name}${l.variant.position !== "NONE" ? ` ${l.variant.position}` : ""}`;
        return `${l.qty}× ${label}`;
      })
      .join(" + ");

    const channels = s.payments
      .map((p) => `${p.channel} ${fmt(new Decimal(p.amount.toString()))}`)
      .join(" · ");

    return { saleId: s.id, date: s.date, items, total: saleTotal, channels };
  });

  // Debt: opening balance + credit sales - collections (all time, not date-filtered)
  const allSalesForDebt = await prisma.sale.findMany({
    where: { customerId: id },
    include: { payments: { where: { channel: "DEBT" } } },
  });
  const openingDebt = customer.openingBalanceEntries.reduce(
    (s, e) => s.plus(e.amount?.toString() ?? "0"),
    new Decimal(0)
  );
  const saleDebt = allSalesForDebt
    .flatMap((s) => s.payments)
    .reduce((s, p) => s.plus(p.amount.toString()), new Decimal(0));
  const totalCollected = customer.debtCollections.reduce(
    (s, dc) => s.plus(dc.amount.toString()),
    new Decimal(0)
  );
  const outstandingDebt = openingDebt.plus(saleDebt).minus(totalCollected);

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    createdAt: customer.createdAt,
    totalSpent,
    visitCount: customer.sales.length,
    outstandingDebt,
    sales,
  };
}

export interface CustomerRankRow {
  id: string;
  name: string;
  phone: string | null;
  totalSpent: Decimal;
  visitCount: number;
  outstandingDebt: Decimal;
  lastVisit: Date | null;
}

export async function getRankedCustomers(): Promise<CustomerRankRow[]> {
  const customers = await prisma.customer.findMany({
    include: {
      openingBalanceEntries: { where: { kind: "DEBTOR" } },
      debtCollections: true,
      sales: {
        include: {
          lines: { select: { lineTotal: true } },
          payments: { where: { channel: "DEBT" } },
        },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => {
    const totalSpent = c.sales.reduce(
      (sum, s) =>
        sum.plus(s.lines.reduce((ls, l) => ls.plus(l.lineTotal.toString()), new Decimal(0))),
      new Decimal(0)
    );
    const openingDebt = c.openingBalanceEntries.reduce(
      (s, e) => s.plus(e.amount?.toString() ?? "0"),
      new Decimal(0)
    );
    const saleDebt = c.sales
      .flatMap((s) => s.payments)
      .reduce((s, p) => s.plus(p.amount.toString()), new Decimal(0));
    const totalCollected = c.debtCollections.reduce(
      (s, dc) => s.plus(dc.amount.toString()),
      new Decimal(0)
    );
    const outstandingDebt = openingDebt.plus(saleDebt).minus(totalCollected);
    const lastVisit = c.sales[0]?.date ?? null;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      totalSpent,
      visitCount: c.sales.length,
      outstandingDebt,
      lastVisit,
    };
  });
}
