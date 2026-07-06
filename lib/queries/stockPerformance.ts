import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface PerfRow {
  key: string; // variantId or sizeBucket
  label: string;
  sub: string | null; // brand for a type, item count for a size
  qtySold: number;
  revenue: Decimal;
  grossProfit: Decimal;
  marginPct: Decimal;
}

export interface StockPerformanceResult {
  from: Date;
  to: Date;
  totalUnits: number;
  totalRevenue: Decimal;
  totalProfit: Decimal;
  topTypes: PerfRow[];
  topSizes: PerfRow[];
}

interface Agg {
  qty: number;
  revenue: Decimal;
  cogs: Decimal;
}

function emptyAgg(): Agg {
  return { qty: 0, revenue: new Decimal(0), cogs: new Decimal(0) };
}

function toRow(key: string, label: string, sub: string | null, a: Agg): PerfRow {
  const grossProfit = a.revenue.minus(a.cogs);
  const marginPct = a.revenue.gt(0)
    ? grossProfit.div(a.revenue).mul(100)
    : new Decimal(0);
  return {
    key,
    label,
    sub,
    qtySold: a.qty,
    revenue: a.revenue,
    grossProfit,
    marginPct,
  };
}

/**
 * Best-performing tyre types (variants) and sizes (buckets) over a period,
 * ranked by units sold. Revenue and gross profit come from the sale lines
 * (gross profit = lineTotal − unitCostAtSale × qty, using the cost snapshot
 * captured at sale time).
 */
export async function getStockPerformance(
  from: Date,
  to: Date,
  limit: number = 8
): Promise<StockPerformanceResult> {
  const lines = await prisma.saleLine.findMany({
    where: { sale: { date: { gte: from, lte: to } } },
    include: { variant: { include: { brand: true } } },
  });

  const byType = new Map<string, { variant: (typeof lines)[0]["variant"]; agg: Agg }>();
  const bySize = new Map<string, { agg: Agg; variantIds: Set<string> }>();

  let totalUnits = 0;
  let totalRevenue = new Decimal(0);
  let totalCogs = new Decimal(0);

  for (const l of lines) {
    const revenue = new Decimal(l.lineTotal.toString());
    const cogs = new Decimal(l.unitCostAtSale.toString()).mul(l.qty);

    totalUnits += l.qty;
    totalRevenue = totalRevenue.plus(revenue);
    totalCogs = totalCogs.plus(cogs);

    // by type (variant)
    const vid = l.variantId;
    if (!byType.has(vid)) byType.set(vid, { variant: l.variant, agg: emptyAgg() });
    const ta = byType.get(vid)!.agg;
    ta.qty += l.qty;
    ta.revenue = ta.revenue.plus(revenue);
    ta.cogs = ta.cogs.plus(cogs);

    // by size (bucket)
    const bucket = l.variant.sizeBucket;
    if (!bySize.has(bucket)) bySize.set(bucket, { agg: emptyAgg(), variantIds: new Set() });
    const sEntry = bySize.get(bucket)!;
    sEntry.agg.qty += l.qty;
    sEntry.agg.revenue = sEntry.agg.revenue.plus(revenue);
    sEntry.agg.cogs = sEntry.agg.cogs.plus(cogs);
    sEntry.variantIds.add(vid);
  }

  const topTypes = Array.from(byType.entries())
    .map(([vid, { variant, agg }]) => {
      const label = `${variant.sizeCanonical} ${variant.brand.name}${variant.subLabel ? ` ${variant.subLabel}` : ""}`.trim();
      return toRow(vid, label, variant.brand.name, agg);
    })
    .sort((a, b) => b.qtySold - a.qtySold || b.revenue.comparedTo(a.revenue))
    .slice(0, limit);

  const topSizes = Array.from(bySize.entries())
    .map(([bucket, { agg, variantIds }]) =>
      toRow(bucket, `${bucket}"`, `${variantIds.size} type(s)`, agg)
    )
    .sort((a, b) => b.qtySold - a.qtySold || b.revenue.comparedTo(a.revenue))
    .slice(0, limit);

  return {
    from,
    to,
    totalUnits,
    totalRevenue,
    totalProfit: totalRevenue.minus(totalCogs),
    topTypes,
    topSizes,
  };
}
