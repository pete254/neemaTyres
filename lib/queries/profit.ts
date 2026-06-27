import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface VariantProfit {
  variantId: string;
  label: string;
  sizeCanonical: string;
  brandName: string;
  qtySold: number;
  revenue: Decimal;
  cogs: Decimal;
  grossProfit: Decimal;
  marginPct: Decimal;
}

export async function getProfitByVariant(
  from: Date,
  to: Date
): Promise<VariantProfit[]> {
  const lines = await prisma.saleLine.findMany({
    where: { sale: { date: { gte: from, lte: to } } },
    include: { variant: { include: { brand: true } } },
  });

  const byVariant = new Map<string, { lines: typeof lines; variant: (typeof lines)[0]["variant"] }>();
  for (const line of lines) {
    const vid = line.variantId;
    if (!byVariant.has(vid)) byVariant.set(vid, { lines: [], variant: line.variant });
    byVariant.get(vid)!.lines.push(line);
  }

  return Array.from(byVariant.values()).map(({ lines: vLines, variant }) => {
    const qtySold = vLines.reduce((sum, l) => sum + l.qty, 0);
    const revenue = vLines.reduce(
      (sum, l) => sum.plus(l.lineTotal.toString()),
      new Decimal(0)
    );
    const cogs = vLines.reduce(
      (sum, l) =>
        sum.plus(new Decimal(l.unitCostAtSale.toString()).mul(l.qty)),
      new Decimal(0)
    );
    const grossProfit = revenue.minus(cogs);
    const marginPct = revenue.gt(0)
      ? grossProfit.div(revenue).mul(100)
      : new Decimal(0);

    const label =
      `${variant.sizeCanonical} ${variant.brand.name}${variant.subLabel ? ` ${variant.subLabel}` : ""}`.trim();

    return {
      variantId: variant.id,
      label,
      sizeCanonical: variant.sizeCanonical,
      brandName: variant.brand.name,
      qtySold,
      revenue,
      cogs,
      grossProfit,
      marginPct,
    };
  });
}
