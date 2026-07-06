import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

function variantLabel(v: {
  sizeCanonical: string;
  brand: { name: string };
  position: string;
  subLabel: string | null;
}): string {
  const base = `${v.sizeCanonical} ${v.brand.name}${v.subLabel ? ` ${v.subLabel}` : ""}`;
  return `${base}${v.position !== "NONE" ? ` ${v.position}` : ""}`.trim();
}

export interface StockableVariant {
  id: string;
  label: string;
  sizeBucket: string;
  position: string;
  qtyOnHand: number;
  lastStockedInAt: Date | null;
}

/**
 * Every tyre type, sorted by recency of being stocked in — the most recent
 * purchase or sale-return first. Variants never stocked in sink to the bottom.
 */
export async function getStockableVariants(): Promise<StockableVariant[]> {
  const [variants, purchaseLines, saleReturns] = await Promise.all([
    prisma.productVariant.findMany({ include: { brand: true } }),
    prisma.purchaseLine.findMany({
      select: { variantId: true, purchase: { select: { date: true } } },
    }),
    prisma.return.findMany({
      where: { type: "SALE_RETURN" },
      select: { variantId: true, date: true },
    }),
  ]);

  // variantId -> most recent stock-in date
  const lastIn = new Map<string, Date>();
  const bump = (variantId: string, date: Date) => {
    const prev = lastIn.get(variantId);
    if (!prev || date > prev) lastIn.set(variantId, date);
  };
  for (const pl of purchaseLines) bump(pl.variantId, pl.purchase.date);
  for (const r of saleReturns) bump(r.variantId, r.date);

  return variants
    .map((v) => ({
      id: v.id,
      label: variantLabel(v),
      sizeBucket: v.sizeBucket,
      position: v.position,
      qtyOnHand: v.qtyOnHand,
      lastStockedInAt: lastIn.get(v.id) ?? null,
    }))
    .sort((a, b) => {
      const at = a.lastStockedInAt?.getTime() ?? -Infinity;
      const bt = b.lastStockedInAt?.getTime() ?? -Infinity;
      if (at !== bt) return bt - at; // most recent first, nulls last
      return a.label.localeCompare(b.label);
    });
}

export type LedgerRowKind =
  | "OPENING"
  | "PURCHASE"
  | "SALE"
  | "SALE_RETURN"
  | "PURCHASE_RETURN";

export interface LedgerRow {
  kind: LedgerRowKind;
  date: Date | null;
  description: string;
  qtyIn: number;
  qtyOut: number;
  unitValue: Decimal;
  balance: number;
}

export interface VariantLedger {
  variantId: string;
  label: string;
  position: string;
  openingQty: number;
  currentStock: number;
  rows: LedgerRow[];
}

/**
 * Full stock movement ledger for one tyre type: opening stock, then every
 * purchase (in), sale (out) and return in date order, with a running balance
 * that should reconcile to the variant's current qtyOnHand.
 */
export async function getVariantStockLedger(
  variantId: string
): Promise<VariantLedger | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      brand: true,
      openingBalanceEntries: { where: { kind: "STOCK" } },
      purchaseLines: {
        include: {
          purchase: { select: { date: true, supplier: { select: { name: true } } } },
        },
      },
      saleLines: {
        include: {
          sale: { select: { date: true, customer: { select: { name: true } } } },
        },
      },
      returns: true,
    },
  });

  if (!variant) return null;

  const openingQty = variant.openingBalanceEntries.reduce(
    (sum, e) => sum + (e.qty ?? 0),
    0
  );
  const openingCost = variant.openingBalanceEntries.reduce(
    (sum, e) => sum.plus(e.unitCost?.toString() ?? "0"),
    new Decimal(0)
  );

  // Build undated (opening) + dated movement rows, then sort dated by date asc.
  interface DraftRow {
    kind: LedgerRowKind;
    date: Date;
    createdAt: Date;
    description: string;
    qtyIn: number;
    qtyOut: number;
    unitValue: Decimal;
  }

  const drafts: DraftRow[] = [];

  for (const pl of variant.purchaseLines) {
    drafts.push({
      kind: "PURCHASE",
      date: pl.purchase.date,
      createdAt: pl.purchase.date,
      description: `Purchase — ${pl.purchase.supplier?.name ?? "No supplier"}`,
      qtyIn: pl.qty,
      qtyOut: 0,
      unitValue: new Decimal(pl.unitCost.toString()),
    });
  }

  for (const sl of variant.saleLines) {
    drafts.push({
      kind: "SALE",
      date: sl.sale.date,
      createdAt: sl.sale.date,
      description: `Sale — ${sl.sale.customer?.name ?? "Walk-in"}`,
      qtyIn: 0,
      qtyOut: sl.qty,
      unitValue: new Decimal(sl.unitPrice.toString()),
    });
  }

  for (const r of variant.returns) {
    const isSaleReturn = r.type === "SALE_RETURN";
    drafts.push({
      kind: isSaleReturn ? "SALE_RETURN" : "PURCHASE_RETURN",
      date: r.date,
      createdAt: r.createdAt,
      description: isSaleReturn ? "Sale return" : "Purchase return",
      qtyIn: isSaleReturn ? r.qty : 0,
      qtyOut: isSaleReturn ? 0 : r.qty,
      unitValue: new Decimal(r.unitValue.toString()),
    });
  }

  drafts.sort((a, b) => {
    const d = a.date.getTime() - b.date.getTime();
    if (d !== 0) return d;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const rows: LedgerRow[] = [];
  let balance = openingQty;

  rows.push({
    kind: "OPENING",
    date: null,
    description: "Opening stock",
    qtyIn: openingQty,
    qtyOut: 0,
    unitValue: openingCost,
    balance,
  });

  for (const d of drafts) {
    balance += d.qtyIn - d.qtyOut;
    rows.push({
      kind: d.kind,
      date: d.date,
      description: d.description,
      qtyIn: d.qtyIn,
      qtyOut: d.qtyOut,
      unitValue: d.unitValue,
      balance,
    });
  }

  return {
    variantId: variant.id,
    label: variantLabel(variant),
    position: variant.position,
    openingQty,
    currentStock: variant.qtyOnHand,
    rows,
  };
}
