import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface TopVariant {
  rank: number;
  variantId: string;
  label: string;
  sizeCanonical: string;
  brandName: string;
  qtySold: number;
  revenue: Decimal;
}

export async function getTopSellingVariants(
  from: Date,
  to: Date,
  limit: number = 10
): Promise<TopVariant[]> {
  const lines = await prisma.saleLine.findMany({
    where: { sale: { date: { gte: from, lte: to } } },
    include: { variant: { include: { brand: true } } },
  });

  const byVariant = new Map<
    string,
    { variant: (typeof lines)[0]["variant"]; qtySold: number; revenue: Decimal }
  >();

  for (const line of lines) {
    const vid = line.variantId;
    if (!byVariant.has(vid)) {
      byVariant.set(vid, {
        variant: line.variant,
        qtySold: 0,
        revenue: new Decimal(0),
      });
    }
    const entry = byVariant.get(vid)!;
    entry.qtySold += line.qty;
    entry.revenue = entry.revenue.plus(line.lineTotal.toString());
  }

  return Array.from(byVariant.values())
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, limit)
    .map((entry, i) => ({
      rank: i + 1,
      variantId: entry.variant.id,
      label:
        `${entry.variant.sizeCanonical} ${entry.variant.brand.name}${entry.variant.subLabel ? ` ${entry.variant.subLabel}` : ""}`.trim(),
      sizeCanonical: entry.variant.sizeCanonical,
      brandName: entry.variant.brand.name,
      qtySold: entry.qtySold,
      revenue: entry.revenue,
    }));
}
