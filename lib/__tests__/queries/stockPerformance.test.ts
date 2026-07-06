import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { saleLine: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { getStockPerformance } from "@/lib/queries/stockPerformance";

const dec = (n: string) => ({ toString: () => n });

function line(
  variantId: string,
  sizeBucket: string,
  brand: string,
  qty: number,
  lineTotal: string,
  unitCostAtSale: string
) {
  return {
    variantId,
    qty,
    lineTotal: dec(lineTotal),
    unitCostAtSale: dec(unitCostAtSale),
    variant: {
      id: variantId,
      sizeCanonical: `${sizeBucket}-CANON`,
      sizeBucket,
      subLabel: null,
      brand: { name: brand },
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("getStockPerformance", () => {
  it("ranks types and sizes by units sold with revenue, profit and margin", async () => {
    (prisma.saleLine.findMany as any).mockResolvedValue([
      // variant A (size 22.5): 10 units, rev 100000, cost 60000 -> profit 40000
      line("A", "22.5", "BS", 6, "60000", "6000"),
      line("A", "22.5", "BS", 4, "40000", "6000"),
      // variant B (size 20): 3 units, rev 45000, cost 30000 -> profit 15000
      line("B", "20", "MX", 3, "45000", "10000"),
      // variant C (size 22.5): 2 units, rev 30000, cost 20000
      line("C", "22.5", "GY", 2, "30000", "10000"),
    ]);

    const r = await getStockPerformance(new Date("2026-06-01"), new Date("2026-07-01"));

    expect(r.totalUnits).toBe(15);
    expect(r.totalRevenue.toString()).toBe("175000");
    // total cost = 6000*10 + 10000*3 + 10000*2 = 60000+30000+20000 = 110000
    expect(r.totalProfit.toString()).toBe("65000");

    // Types ranked by units: A(10) > B(3) > C(2)
    expect(r.topTypes.map((t) => t.key)).toEqual(["A", "B", "C"]);
    expect(r.topTypes[0].qtySold).toBe(10);
    expect(r.topTypes[0].revenue.toString()).toBe("100000");
    expect(r.topTypes[0].grossProfit.toString()).toBe("40000");
    expect(r.topTypes[0].marginPct.toDecimalPlaces(0).toString()).toBe("40");

    // Sizes: 22.5 (A+C = 12 units, 2 types) > 20 (3 units)
    expect(r.topSizes.map((s) => s.key)).toEqual(["22.5", "20"]);
    expect(r.topSizes[0].label).toBe('22.5"');
    expect(r.topSizes[0].qtySold).toBe(12);
    expect(r.topSizes[0].sub).toBe("2 type(s)");
  });

  it("returns empty leaderboards and zero totals when there are no sales", async () => {
    (prisma.saleLine.findMany as any).mockResolvedValue([]);
    const r = await getStockPerformance(new Date(), new Date());
    expect(r.totalUnits).toBe(0);
    expect(r.topTypes).toEqual([]);
    expect(r.topSizes).toEqual([]);
  });
});
