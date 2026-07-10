import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

/** One tyre-type (variant) line within a day's profit breakdown. */
export interface ProfitLineRow {
  variantId: string;
  label: string;
  brandName: string;
  sizeBucket: string;
  qty: number;
  revenue: Decimal;
  cogs: Decimal;
  grossProfit: Decimal;
  marginPct: Decimal;
}

/** A single day's aggregated profit plus its per-variant breakdown. */
export interface ProfitDay {
  date: string; // YYYY-MM-DD
  qty: number;
  revenue: Decimal;
  cogs: Decimal;
  grossProfit: Decimal;
  marginPct: Decimal;
  rows: ProfitLineRow[]; // best gross profit first
}

export interface ProfitBreakdownResult {
  from: Date;
  to: Date;
  totalQty: number;
  totalRevenue: Decimal;
  totalCogs: Decimal;
  totalProfit: Decimal;
  marginPct: Decimal;
  days: ProfitDay[]; // newest first
  sizes: string[]; // available size buckets, for the size filter
  brands: string[]; // available brand names (tyre "type"), for the type filter
}

export interface ProfitFilters {
  size?: string; // sizeBucket
  brand?: string; // brand name — the tyre "type"
}

const BUCKET_ORDER = ["22.5", "20", "19.5", "17.5", "16", "15", "14", "13"];
const bucketRank = (b: string) => {
  const i = BUCKET_ORDER.indexOf(b);
  return i === -1 ? 99 : i;
};

function marginOf(revenue: Decimal, grossProfit: Decimal): Decimal {
  return revenue.gt(0) ? grossProfit.div(revenue).mul(100) : new Decimal(0);
}

/**
 * Gross-profit breakdown grouped by sale date, with a per-variant detail list
 * under each day. Profit is revenue (lineTotal) minus COGS
 * (unitCostAtSale × qty), using the cost snapshot captured at sale time —
 * identical to how the dashboard's "Gross Profit" card is computed.
 *
 * Optionally filtered to a single size bucket and/or brand (tyre type). The
 * `sizes` / `brands` lists returned are the full set of options (independent of
 * the current filter or date range) so the filter dropdowns stay stable.
 */
export async function getProfitBreakdown(
  from: Date,
  to: Date,
  filters: ProfitFilters = {}
): Promise<ProfitBreakdownResult> {
  const variantWhere = {
    ...(filters.size ? { sizeBucket: filters.size } : {}),
    ...(filters.brand ? { brand: { name: filters.brand } } : {}),
  };

  const [lines, variantBuckets, brandRows] = await Promise.all([
    prisma.saleLine.findMany({
      where: {
        sale: { date: { gte: from, lte: to } },
        ...(Object.keys(variantWhere).length ? { variant: variantWhere } : {}),
      },
      include: {
        variant: { include: { brand: true } },
        sale: { select: { date: true } },
      },
    }),
    prisma.productVariant.findMany({
      select: { sizeBucket: true },
      distinct: ["sizeBucket"],
    }),
    prisma.brand.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);

  // day -> variant -> aggregate
  const days = new Map<
    string,
    {
      qty: number;
      revenue: Decimal;
      cogs: Decimal;
      byVariant: Map<
        string,
        { variant: (typeof lines)[0]["variant"]; qty: number; revenue: Decimal; cogs: Decimal }
      >;
    }
  >();

  let totalQty = 0;
  let totalRevenue = new Decimal(0);
  let totalCogs = new Decimal(0);

  for (const l of lines) {
    const revenue = new Decimal(l.lineTotal.toString());
    const cogs = new Decimal(l.unitCostAtSale.toString()).mul(l.qty);
    const dateKey = l.sale.date.toISOString().slice(0, 10);

    totalQty += l.qty;
    totalRevenue = totalRevenue.plus(revenue);
    totalCogs = totalCogs.plus(cogs);

    if (!days.has(dateKey)) {
      days.set(dateKey, { qty: 0, revenue: new Decimal(0), cogs: new Decimal(0), byVariant: new Map() });
    }
    const day = days.get(dateKey)!;
    day.qty += l.qty;
    day.revenue = day.revenue.plus(revenue);
    day.cogs = day.cogs.plus(cogs);

    if (!day.byVariant.has(l.variantId)) {
      day.byVariant.set(l.variantId, { variant: l.variant, qty: 0, revenue: new Decimal(0), cogs: new Decimal(0) });
    }
    const v = day.byVariant.get(l.variantId)!;
    v.qty += l.qty;
    v.revenue = v.revenue.plus(revenue);
    v.cogs = v.cogs.plus(cogs);
  }

  const daysOut: ProfitDay[] = Array.from(days.entries())
    .map(([date, d]) => {
      const grossProfit = d.revenue.minus(d.cogs);
      const rows: ProfitLineRow[] = Array.from(d.byVariant.values())
        .map(({ variant, qty, revenue, cogs }) => {
          const gp = revenue.minus(cogs);
          return {
            variantId: variant.id,
            label: `${variant.sizeCanonical} ${variant.brand.name}${variant.subLabel ? ` ${variant.subLabel}` : ""}`.trim(),
            brandName: variant.brand.name,
            sizeBucket: variant.sizeBucket,
            qty,
            revenue,
            cogs,
            grossProfit: gp,
            marginPct: marginOf(revenue, gp),
          };
        })
        .sort((a, b) => b.grossProfit.comparedTo(a.grossProfit));

      return {
        date,
        qty: d.qty,
        revenue: d.revenue,
        cogs: d.cogs,
        grossProfit,
        marginPct: marginOf(d.revenue, grossProfit),
        rows,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

  const sizes = variantBuckets
    .map((v) => v.sizeBucket)
    .sort((a, b) => bucketRank(a) - bucketRank(b) || a.localeCompare(b));

  return {
    from,
    to,
    totalQty,
    totalRevenue,
    totalCogs,
    totalProfit: totalRevenue.minus(totalCogs),
    marginPct: marginOf(totalRevenue, totalRevenue.minus(totalCogs)),
    days: daysOut,
    sizes,
    brands: brandRows.map((b) => b.name),
  };
}
