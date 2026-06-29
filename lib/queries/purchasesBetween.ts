import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface PurchaseLineItem {
  purchaseId: string;
  purchaseDate: Date;
  supplierName: string;
  variantLabel: string;
  qty: number;
  unitCost: Decimal;
  lineTotal: Decimal;
}

export interface PurchaseDay {
  date: string;
  purchasesCount: number;
  totalCost: Decimal;
  lines: PurchaseLineItem[];
}

export interface PurchasesBetweenResult {
  from: Date;
  to: Date;
  totalCost: Decimal;
  days: PurchaseDay[];
}

export async function getPurchasesBetween(
  from: Date,
  to: Date
): Promise<PurchasesBetweenResult> {
  const purchases = await prisma.purchase.findMany({
    where: { date: { gte: from, lte: to } },
    include: {
      supplier: { select: { name: true } },
      lines: { include: { variant: { include: { brand: true } } } },
    },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, typeof purchases>();
  for (const purchase of purchases) {
    const day = purchase.date.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(purchase);
  }

  let totalCost = new Decimal(0);

  const days: PurchaseDay[] = Array.from(byDay.entries()).map(
    ([date, dayPurchases]) => {
      const dayTotal = dayPurchases
        .flatMap((p) => p.lines)
        .reduce((sum, l) => sum.plus(l.lineTotal.toString()), new Decimal(0));

      totalCost = totalCost.plus(dayTotal);

      const lines = dayPurchases.flatMap((purchase) =>
        purchase.lines.map((line) => ({
          purchaseId: purchase.id,
          purchaseDate: purchase.date,
          supplierName: purchase.supplier?.name ?? "Unknown",
          variantLabel: `${line.variant.sizeCanonical} ${line.variant.brand.name}${line.variant.subLabel ? ` ${line.variant.subLabel}` : ""}`.trim(),
          qty: line.qty,
          unitCost: new Decimal(line.unitCost.toString()),
          lineTotal: new Decimal(line.lineTotal.toString()),
        }))
      );

      return { date, purchasesCount: dayPurchases.length, totalCost: dayTotal, lines };
    }
  );

  return { from, to, totalCost, days };
}
