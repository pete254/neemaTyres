import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface PurchasePerfRow {
  key: string; // variantId or size bucket
  label: string;
  sub: string | null; // brand for a type, type-count for a size
  qty: number; // units purchased
  totalCost: Decimal;
  avgUnitCost: Decimal;
}

export interface PurchasePerformanceResult {
  from: Date;
  to: Date;
  totalUnits: number;
  totalCost: Decimal;
  byType: PurchasePerfRow[]; // most units first
  bySize: PurchasePerfRow[]; // most units first
}

interface Agg {
  qty: number;
  cost: Decimal;
}

function emptyAgg(): Agg {
  return { qty: 0, cost: new Decimal(0) };
}

function toRow(key: string, label: string, sub: string | null, a: Agg): PurchasePerfRow {
  return {
    key,
    label,
    sub,
    qty: a.qty,
    totalCost: a.cost,
    avgUnitCost: a.qty > 0 ? a.cost.div(a.qty) : new Decimal(0),
  };
}

/**
 * Purchases aggregated by tyre type (variant) and by size (bucket) over a
 * period, ranked by units purchased. Cost is the purchase line total; the
 * average unit cost is total cost / units (a period blended cost, distinct
 * from the variant's WAC).
 */
export async function getPurchasePerformance(
  from: Date,
  to: Date
): Promise<PurchasePerformanceResult> {
  const lines = await prisma.purchaseLine.findMany({
    where: { purchase: { date: { gte: from, lte: to } } },
    include: { variant: { include: { brand: true } } },
  });

  const byType = new Map<string, { variant: (typeof lines)[0]["variant"]; agg: Agg }>();
  const bySize = new Map<string, { agg: Agg; variantIds: Set<string> }>();

  let totalUnits = 0;
  let totalCost = new Decimal(0);

  for (const l of lines) {
    const qty = l.qty;
    const cost = new Decimal(l.lineTotal.toString());

    totalUnits += qty;
    totalCost = totalCost.plus(cost);

    const vid = l.variantId;
    if (!byType.has(vid)) byType.set(vid, { variant: l.variant, agg: emptyAgg() });
    const ta = byType.get(vid)!.agg;
    ta.qty += qty;
    ta.cost = ta.cost.plus(cost);

    const bucket = l.variant.sizeBucket;
    if (!bySize.has(bucket)) bySize.set(bucket, { agg: emptyAgg(), variantIds: new Set() });
    const sEntry = bySize.get(bucket)!;
    sEntry.agg.qty += qty;
    sEntry.agg.cost = sEntry.agg.cost.plus(cost);
    sEntry.variantIds.add(vid);
  }

  const byTypeRows = Array.from(byType.entries())
    .map(([vid, { variant, agg }]) => {
      const label = `${variant.sizeCanonical} ${variant.brand.name}${variant.subLabel ? ` ${variant.subLabel}` : ""}`.trim();
      return toRow(vid, label, variant.brand.name, agg);
    })
    .sort((a, b) => b.qty - a.qty || b.totalCost.comparedTo(a.totalCost));

  const bySizeRows = Array.from(bySize.entries())
    .map(([bucket, { agg, variantIds }]) =>
      toRow(bucket, `${bucket}"`, `${variantIds.size} type(s)`, agg)
    )
    .sort((a, b) => b.qty - a.qty || b.totalCost.comparedTo(a.totalCost));

  return {
    from,
    to,
    totalUnits,
    totalCost,
    byType: byTypeRows,
    bySize: bySizeRows,
  };
}
