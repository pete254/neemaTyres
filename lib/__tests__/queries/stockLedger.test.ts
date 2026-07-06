import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productVariant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    purchaseLine: {
      findMany: vi.fn(),
    },
    return: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getStockableVariants,
  getVariantStockLedger,
} from "@/lib/queries/stockLedger";

const dec = (n: string) => ({ toString: () => n });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getStockableVariants", () => {
  it("sorts by most recent stock-in (purchase or sale return) first, nulls last", async () => {
    (prisma.productVariant.findMany as any).mockResolvedValue([
      { id: "a", sizeCanonical: "11R22.5", brand: { name: "BS" }, position: "STEERING", subLabel: null, qtyOnHand: 5 },
      { id: "b", sizeCanonical: "12R22.5", brand: { name: "MX" }, position: "DIFF", subLabel: null, qtyOnHand: 3 },
      { id: "c", sizeCanonical: "13R22.5", brand: { name: "GY" }, position: "NONE", subLabel: null, qtyOnHand: 0 },
    ]);
    // a: last purchase 2026-05-01; b: last purchase 2026-01-01 but sale-return 2026-06-01; c: never
    (prisma.purchaseLine.findMany as any).mockResolvedValue([
      { variantId: "a", purchase: { date: new Date("2026-05-01") } },
      { variantId: "b", purchase: { date: new Date("2026-01-01") } },
    ]);
    (prisma.return.findMany as any).mockResolvedValue([
      { variantId: "b", date: new Date("2026-06-01") },
    ]);

    const result = await getStockableVariants();
    expect(result.map((v) => v.id)).toEqual(["b", "a", "c"]);
    expect(result[0].label).toBe("12R22.5 MX DIFF");
    expect(result[0].lastStockedInAt).toEqual(new Date("2026-06-01"));
    expect(result[2].lastStockedInAt).toBeNull();
  });
});

describe("getVariantStockLedger", () => {
  it("returns null for a missing variant", async () => {
    (prisma.productVariant.findUnique as any).mockResolvedValue(null);
    expect(await getVariantStockLedger("nope")).toBeNull();
  });

  it("builds an opening -> movements ledger with a running balance ending at current stock", async () => {
    (prisma.productVariant.findUnique as any).mockResolvedValue({
      id: "v1",
      sizeCanonical: "11R22.5",
      brand: { name: "Bridgestone" },
      position: "STEERING",
      subLabel: null,
      qtyOnHand: 70,
      openingBalanceEntries: [{ qty: 20, unitCost: dec("10000") }],
      purchaseLines: [
        { qty: 40, unitCost: dec("11000"), purchase: { date: new Date("2026-05-02"), supplier: { name: "Neema" } } },
        { qty: 30, unitCost: dec("12000"), purchase: { date: new Date("2026-06-01"), supplier: null } },
      ],
      saleLines: [
        { qty: 12, unitPrice: dec("15000"), sale: { date: new Date("2026-05-10"), customer: { name: "Acme" } } },
        { qty: 8, unitPrice: dec("15000"), sale: { date: new Date("2026-06-14"), customer: null } },
      ],
      returns: [],
    });

    const ledger = await getVariantStockLedger("v1");
    expect(ledger).not.toBeNull();
    expect(ledger!.label).toBe("11R22.5 Bridgestone STEERING");
    expect(ledger!.openingQty).toBe(20);
    expect(ledger!.currentStock).toBe(70);

    // Opening first, then movements sorted by date asc
    expect(ledger!.rows.map((r) => r.kind)).toEqual([
      "OPENING", "PURCHASE", "SALE", "PURCHASE", "SALE",
    ]);
    // Running balance: 20 -> 60 -> 48 -> 78 -> 70
    expect(ledger!.rows.map((r) => r.balance)).toEqual([20, 60, 48, 78, 70]);
    // Reconciles to qtyOnHand
    expect(ledger!.rows[ledger!.rows.length - 1].balance).toBe(ledger!.currentStock);
    // Descriptions fall back to "No supplier" / "Walk-in"
    expect(ledger!.rows[3].description).toBe("Purchase — No supplier");
    expect(ledger!.rows[4].description).toBe("Sale — Walk-in");
  });

  it("treats sale returns as inflows and purchase returns as outflows", async () => {
    (prisma.productVariant.findUnique as any).mockResolvedValue({
      id: "v2",
      sizeCanonical: "12R22.5",
      brand: { name: "MX" },
      position: "NONE",
      subLabel: "Retread",
      qtyOnHand: 4,
      openingBalanceEntries: [],
      purchaseLines: [
        { qty: 5, unitCost: dec("9000"), purchase: { date: new Date("2026-04-01"), supplier: { name: "S" } } },
      ],
      saleLines: [],
      returns: [
        { type: "SALE_RETURN", qty: 2, unitValue: dec("12000"), date: new Date("2026-04-10"), createdAt: new Date("2026-04-10") },
        { type: "PURCHASE_RETURN", qty: 3, unitValue: dec("9000"), date: new Date("2026-04-20"), createdAt: new Date("2026-04-20") },
      ],
    });

    const ledger = await getVariantStockLedger("v2");
    expect(ledger!.label).toBe("12R22.5 MX Retread");
    // 0 -> +5 (7? no opening 0) => 5 -> +2 => 7 -> -3 => 4
    expect(ledger!.rows.map((r) => r.balance)).toEqual([0, 5, 7, 4]);
    expect(ledger!.rows[2].qtyIn).toBe(2);
    expect(ledger!.rows[3].qtyOut).toBe(3);
    expect(ledger!.currentStock).toBe(4);
  });
});
