import { NextRequest } from "next/server";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(todayStr + "T00:00:00Z");
  const todayEnd = new Date(todayStr + "T23:59:59Z");

  const [inventory, customers, todaySaleLines, todayPurchaseAgg] =
    await Promise.all([
      prisma.productVariant.findMany({
        select: { qtyOnHand: true, wacCost: true },
      }),
      prisma.customer.findMany({
        include: {
          openingBalanceEntries: { where: { kind: "DEBTOR" } },
          sales: { include: { payments: { where: { channel: "DEBT" } } } },
          debtCollections: true,
        },
      }),
      prisma.saleLine.findMany({
        where: { sale: { date: { gte: todayStart, lte: todayEnd } } },
        select: { qty: true, unitCostAtSale: true, lineTotal: true },
      }),
      prisma.purchaseLine.aggregate({
        where: { purchase: { date: { gte: todayStart, lte: todayEnd } } },
        _sum: { lineTotal: true },
      }),
    ]);

  const stockValue = inventory.reduce(
    (sum, v) => sum.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );
  const tyresInStore = inventory.reduce((sum, v) => sum + v.qtyOnHand, 0);

  const debtorData = customers
    .map((c) => {
      const openingDebt = c.openingBalanceEntries.reduce(
        (sum, e) => sum.plus(e.amount?.toString() ?? "0"),
        new Decimal(0)
      );
      const saleDebt = c.sales
        .flatMap((s) => s.payments)
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
      const totalCollected = c.debtCollections.reduce(
        (sum, dc) => sum.plus(dc.amount.toString()),
        new Decimal(0)
      );
      return openingDebt.plus(saleDebt).minus(totalCollected);
    })
    .filter((o) => o.gt(0));

  const activeDebtors = debtorData.length;
  const totalOwed = debtorData.reduce((sum, o) => sum.plus(o), new Decimal(0));

  const todaySales = todaySaleLines.reduce(
    (sum, l) => sum.plus(l.lineTotal.toString()),
    new Decimal(0)
  );
  const todayCOGS = todaySaleLines.reduce(
    (sum, l) => sum.plus(new Decimal(l.unitCostAtSale.toString()).mul(l.qty)),
    new Decimal(0)
  );
  const todayProfit = todaySales.minus(todayCOGS);
  const todayPurchases = new Decimal(
    (todayPurchaseAgg._sum.lineTotal ?? 0).toString()
  );

  return ok({
    todayStr,
    stockValue,
    tyresInStore,
    activeDebtors,
    totalOwed,
    todaySales,
    todayPurchases,
    todayProfit,
  });
}
