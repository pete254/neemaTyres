import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface VariantPurchaseTxn {
  purchaseId: string;
  date: Date;
  supplierName: string;
  terms: string;
  qty: number;
  unitCost: Decimal;
  lineTotal: Decimal;
}

export interface VariantPurchasesResult {
  variantId: string;
  label: string;
  totalQty: number;
  totalCost: Decimal;
  avgUnitCost: Decimal;
  count: number;
  txns: VariantPurchaseTxn[]; // newest first
}

/**
 * Every purchase transaction (one row per purchase line) for a single tyre
 * type, newest first. With no date range, returns all-time purchases; `from`
 * / `to` narrow it. Returns null if the variant does not exist.
 */
export async function getVariantPurchases(
  variantId: string,
  from?: Date,
  to?: Date
): Promise<VariantPurchasesResult | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { brand: true },
  });
  if (!variant) return null;

  const dateFilter =
    from || to
      ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};

  const lines = await prisma.purchaseLine.findMany({
    where: { variantId, purchase: dateFilter },
    include: {
      purchase: {
        select: { date: true, terms: true, supplier: { select: { name: true } } },
      },
    },
  });

  const txns: VariantPurchaseTxn[] = lines
    .map((l) => ({
      purchaseId: l.purchaseId,
      date: l.purchase.date,
      supplierName: l.purchase.supplier?.name ?? "No supplier",
      terms: l.purchase.terms,
      qty: l.qty,
      unitCost: new Decimal(l.unitCost.toString()),
      lineTotal: new Decimal(l.lineTotal.toString()),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalQty = txns.reduce((s, t) => s + t.qty, 0);
  const totalCost = txns.reduce((s, t) => s.plus(t.lineTotal), new Decimal(0));
  const label = `${variant.sizeCanonical} ${variant.brand.name}${variant.subLabel ? ` ${variant.subLabel}` : ""}`.trim();

  return {
    variantId,
    label,
    totalQty,
    totalCost,
    avgUnitCost: totalQty > 0 ? totalCost.div(totalQty) : new Decimal(0),
    count: txns.length,
    txns,
  };
}
