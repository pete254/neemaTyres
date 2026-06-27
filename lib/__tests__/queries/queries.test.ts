import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    sale: {
      findMany: vi.fn(),
    },
    saleLine: {
      findMany: vi.fn(),
    },
    productVariant: {
      findMany: vi.fn(),
    },
    supplier: {
      findFirst: vi.fn(),
    },
    purchase: {
      findMany: vi.fn(),
    },
    debtCollection: {
      findMany: vi.fn(),
    },
    supplierPayment: {
      findMany: vi.fn(),
    },
    return: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getCustomerDebt } from "@/lib/queries/customerDebt";
import { getSalesBetween } from "@/lib/queries/sales";
import { getProfitByVariant } from "@/lib/queries/profit";
import { getStockOnHand } from "@/lib/queries/stock";
import { getSupplierBalance } from "@/lib/queries/supplierBalance";
import { getTopSellingVariants } from "@/lib/queries/topVariants";
import { getDebtorsAged } from "@/lib/queries/aged";
import { getDayBook } from "@/lib/queries/dayBook";

const d = (n: number | string) => new Decimal(n);

const mockVariant = {
  id: "v1",
  sizeCanonical: "185/65R15",
  brandId: "b1",
  position: "PCR",
  subLabel: null,
  patternCode: "AT",
  qtyOnHand: 10,
  wacCost: { toString: () => "5000.00" },
  brand: { id: "b1", name: "Bridgestone" },
};

const mockBrand = { id: "b1", name: "Bridgestone" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// getCustomerDebt
// ──────────────────────────────────────────────
describe("getCustomerDebt", () => {
  it("returns null when customer not found", async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);
    const result = await getCustomerDebt("Nobody");
    expect(result).toBeNull();
  });

  it("computes FIFO balance and filters paid-off lines", async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      id: "c1",
      name: "Jane",
      phone: null,
      sales: [
        {
          id: "s1",
          date: new Date("2026-01-01"),
          payments: [{ channel: "DEBT", amount: { toString: () => "20000" } }],
        },
        {
          id: "s2",
          date: new Date("2026-02-01"),
          payments: [{ channel: "DEBT", amount: { toString: () => "30000" } }],
        },
      ],
      debtCollections: [
        { amount: { toString: () => "20000" } },
      ],
    } as never);

    const result = await getCustomerDebt("Jane");
    expect(result).not.toBeNull();
    // First sale fully covered by collection; only second sale outstanding
    expect(result!.totalOutstanding.toNumber()).toBe(30000);
    expect(result!.lines).toHaveLength(1);
    expect(result!.lines[0].saleId).toBe("s2");
  });

  it("returns zero outstanding when fully paid", async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      id: "c2",
      name: "Bob",
      phone: null,
      sales: [
        {
          id: "s3",
          date: new Date("2026-01-15"),
          ref: null,
          payments: [{ channel: "DEBT", amount: { toString: () => "10000" } }],
        },
      ],
      debtCollections: [{ amount: { toString: () => "10000" } }],
    } as never);

    const result = await getCustomerDebt("Bob");
    expect(result!.totalOutstanding.toNumber()).toBe(0);
    expect(result!.lines).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// getSalesBetween
// ──────────────────────────────────────────────
describe("getSalesBetween", () => {
  it("groups sales by day and splits by channel", async () => {
    vi.mocked(prisma.sale.findMany).mockResolvedValue([
      {
        id: "s1",
        date: new Date("2026-06-01T08:00:00Z"),
        customer: { name: "Alice" },
        payments: [
          { channel: "CASH", amount: { toString: () => "5000" } },
          { channel: "MPESA", amount: { toString: () => "3000" } },
        ],
        lines: [
          {
            qty: 1,
            unitPrice: { toString: () => "8000" },
            lineTotal: { toString: () => "8000" },
            variant: { ...mockVariant, brand: mockBrand },
          },
        ],
      },
    ] as never);

    const from = new Date("2026-06-01");
    const to = new Date("2026-06-30");
    const result = await getSalesBetween(from, to);

    expect(result.days).toHaveLength(1);
    expect(result.days[0].cash.toNumber()).toBe(5000);
    expect(result.days[0].mpesa.toNumber()).toBe(3000);
    expect(result.days[0].revenue.toNumber()).toBe(8000);
    expect(result.totalRevenue.toNumber()).toBe(8000);
    expect(result.totalCash.toNumber()).toBe(5000);
    expect(result.totalMpesa.toNumber()).toBe(3000);
  });

  it("returns empty when no sales", async () => {
    vi.mocked(prisma.sale.findMany).mockResolvedValue([]);
    const result = await getSalesBetween(new Date(), new Date());
    expect(result.days).toHaveLength(0);
    expect(result.totalRevenue.toNumber()).toBe(0);
  });
});

// ──────────────────────────────────────────────
// getProfitByVariant
// ──────────────────────────────────────────────
describe("getProfitByVariant", () => {
  it("computes revenue, COGS and margin correctly", async () => {
    vi.mocked(prisma.saleLine.findMany).mockResolvedValue([
      {
        variantId: "v1",
        qty: 2,
        unitPrice: { toString: () => "8000" },
        lineTotal: { toString: () => "16000" },
        unitCostAtSale: { toString: () => "5000" },
        variant: { ...mockVariant, brand: mockBrand },
      },
    ] as never);

    const result = await getProfitByVariant(new Date(), new Date());
    expect(result).toHaveLength(1);
    expect(result[0].qtySold).toBe(2);
    expect(result[0].revenue.toNumber()).toBe(16000);
    expect(result[0].cogs.toNumber()).toBe(10000); // 2 × 5000
    expect(result[0].grossProfit.toNumber()).toBe(6000);
    // margin = 6000/16000 × 100 = 37.5%
    expect(result[0].marginPct.toDecimalPlaces(2).toNumber()).toBe(37.5);
  });

  it("handles zero revenue without dividing by zero", async () => {
    vi.mocked(prisma.saleLine.findMany).mockResolvedValue([
      {
        variantId: "v1",
        qty: 0,
        lineTotal: { toString: () => "0" },
        unitCostAtSale: { toString: () => "5000" },
        variant: { ...mockVariant, brand: mockBrand },
      },
    ] as never);

    const result = await getProfitByVariant(new Date(), new Date());
    expect(result[0].marginPct.toNumber()).toBe(0);
  });
});

// ──────────────────────────────────────────────
// getStockOnHand
// ──────────────────────────────────────────────
describe("getStockOnHand", () => {
  it("computes total qty and value", async () => {
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([
      { ...mockVariant, qtyOnHand: 10, wacCost: { toString: () => "5000" } },
      {
        ...mockVariant,
        id: "v2",
        qtyOnHand: 4,
        wacCost: { toString: () => "3000" },
        brand: { id: "b2", name: "Michelin" },
      },
    ] as never);

    const result = await getStockOnHand();
    expect(result.totalQty).toBe(14);
    expect(result.totalValue.toNumber()).toBe(62000); // 10×5000 + 4×3000
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].stockValue.toNumber()).toBe(50000);
  });

  it("returns zero totals for empty inventory", async () => {
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([]);
    const result = await getStockOnHand();
    expect(result.totalQty).toBe(0);
    expect(result.totalValue.toNumber()).toBe(0);
  });
});

// ──────────────────────────────────────────────
// getSupplierBalance
// ──────────────────────────────────────────────
describe("getSupplierBalance", () => {
  it("returns null when supplier not found", async () => {
    vi.mocked(prisma.supplier.findFirst).mockResolvedValue(null);
    const result = await getSupplierBalance("Unknown");
    expect(result).toBeNull();
  });

  it("computes running balance from ledger entries", async () => {
    vi.mocked(prisma.supplier.findFirst).mockResolvedValue({
      id: "sup1",
      name: "Hankook KE",
      ledgerEntries: [
        {
          id: "le1",
          date: new Date("2026-01-01"),
          description: "Purchase on credit",
          debit: { toString: () => "100000" },
          credit: { toString: () => "0" },
        },
        {
          id: "le2",
          date: new Date("2026-01-15"),
          description: "Payment",
          debit: { toString: () => "0" },
          credit: { toString: () => "40000" },
        },
      ],
    } as never);

    const result = await getSupplierBalance("Hankook");
    expect(result).not.toBeNull();
    expect(result!.balance.toNumber()).toBe(60000); // 100000 - 40000
    expect(result!.statement).toHaveLength(2);
    expect(result!.statement[0].runningBalance.toNumber()).toBe(100000);
    expect(result!.statement[1].runningBalance.toNumber()).toBe(60000);
  });
});

// ──────────────────────────────────────────────
// getTopSellingVariants
// ──────────────────────────────────────────────
describe("getTopSellingVariants", () => {
  it("ranks variants by qty sold descending", async () => {
    vi.mocked(prisma.saleLine.findMany).mockResolvedValue([
      {
        variantId: "v1",
        qty: 3,
        lineTotal: { toString: () => "24000" },
        variant: { ...mockVariant, brand: mockBrand },
      },
      {
        variantId: "v2",
        qty: 7,
        lineTotal: { toString: () => "35000" },
        variant: { ...mockVariant, id: "v2", sizeCanonical: "205/55R16", brand: { id: "b2", name: "Michelin" } },
      },
    ] as never);

    const result = await getTopSellingVariants(new Date(), new Date(), 5);
    expect(result[0].rank).toBe(1);
    expect(result[0].variantId).toBe("v2");
    expect(result[0].qtySold).toBe(7);
    expect(result[1].rank).toBe(2);
    expect(result[1].variantId).toBe("v1");
  });

  it("respects the limit", async () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => ({
      variantId: `v${i}`,
      qty: i + 1,
      lineTotal: { toString: () => "1000" },
      variant: { ...mockVariant, id: `v${i}`, brand: mockBrand },
    }));
    vi.mocked(prisma.saleLine.findMany).mockResolvedValue(manyLines as never);

    const result = await getTopSellingVariants(new Date(), new Date(), 5);
    expect(result).toHaveLength(5);
  });
});

// ──────────────────────────────────────────────
// getDebtorsAged
// ──────────────────────────────────────────────
describe("getDebtorsAged", () => {
  it("buckets debts by age and applies FIFO collections", async () => {
    const asOf = new Date("2026-06-27");
    const recent = new Date("2026-06-20"); // 7 days old → current
    const old = new Date("2026-04-01");    // ~87 days old → over60

    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      {
        id: "c1",
        name: "Jane",
        phone: null,
        sales: [
          {
            id: "s1",
            date: old,
            payments: [{ channel: "DEBT", amount: { toString: () => "20000" } }],
          },
          {
            id: "s2",
            date: recent,
            payments: [{ channel: "DEBT", amount: { toString: () => "15000" } }],
          },
        ],
        debtCollections: [
          { amount: { toString: () => "10000" } }, // reduces s1 to 10000
        ],
      },
    ] as never);

    const result = await getDebtorsAged(asOf);
    expect(result.debtors).toHaveLength(1);
    const debtor = result.debtors[0];
    expect(debtor.totalOutstanding.toNumber()).toBe(25000);
    expect(debtor.over60.toNumber()).toBe(10000);  // s1 after 10000 collection
    expect(debtor.current.toNumber()).toBe(15000); // s2 recent
    expect(debtor.days31to60.toNumber()).toBe(0);
  });

  it("excludes customers with zero outstanding", async () => {
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      {
        id: "c2",
        name: "Zero",
        phone: null,
        sales: [
          {
            id: "s1",
            date: new Date("2026-01-01"),
            payments: [{ channel: "DEBT", amount: { toString: () => "5000" } }],
          },
        ],
        debtCollections: [{ amount: { toString: () => "5000" } }],
      },
    ] as never);

    const result = await getDebtorsAged(new Date("2026-06-27"));
    expect(result.debtors).toHaveLength(0);
  });

  it("sums totals across debtors", async () => {
    const asOf = new Date("2026-06-27");
    const now = new Date("2026-06-20");

    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      {
        id: "c1", name: "A", phone: null,
        sales: [{ id: "s1", date: now, payments: [{ channel: "DEBT", amount: { toString: () => "10000" } }] }],
        debtCollections: [],
      },
      {
        id: "c2", name: "B", phone: null,
        sales: [{ id: "s2", date: now, payments: [{ channel: "DEBT", amount: { toString: () => "20000" } }] }],
        debtCollections: [],
      },
    ] as never);

    const result = await getDebtorsAged(asOf);
    expect(result.totals.outstanding.toNumber()).toBe(30000);
    expect(result.totals.current.toNumber()).toBe(30000);
  });
});

// ──────────────────────────────────────────────
// getDayBook
// ──────────────────────────────────────────────
describe("getDayBook", () => {
  it("aggregates all transaction types for the day", async () => {
    vi.mocked(prisma.sale.findMany).mockResolvedValue([
      {
        id: "s1",
        date: new Date("2026-06-20T09:00:00"),
        customer: { name: "Alice" },
        payments: [{ channel: "CASH", amount: { toString: () => "8000" } }],
        lines: [],
      },
    ] as never);

    vi.mocked(prisma.purchase.findMany).mockResolvedValue([
      {
        id: "p1",
        date: new Date("2026-06-20T10:00:00"),
        supplier: { name: "Hankook KE" },
        lines: [{ qty: 4, unitCost: { toString: () => "5000" }, variant: { ...mockVariant, brand: mockBrand } }],
      },
    ] as never);

    vi.mocked(prisma.debtCollection.findMany).mockResolvedValue([
      { id: "dc1", date: new Date("2026-06-20"), customer: { name: "Jane" }, amount: { toString: () => "3000" } },
    ] as never);

    vi.mocked(prisma.supplierPayment.findMany).mockResolvedValue([
      { id: "sp1", date: new Date("2026-06-20"), supplier: { name: "HK" }, amount: { toString: () => "20000" } },
    ] as never);

    vi.mocked(prisma.return.findMany).mockResolvedValue([
      { id: "r1", date: new Date("2026-06-20"), qty: 1, unitValue: { toString: () => "4000" }, variant: { ...mockVariant, brand: mockBrand } },
    ] as never);

    const result = await getDayBook(new Date("2026-06-20"));

    expect(result.sales).toHaveLength(1);
    expect(result.purchases).toHaveLength(1);
    expect(result.debtCollections).toHaveLength(1);
    expect(result.supplierPayments).toHaveLength(1);
    expect(result.returns).toHaveLength(1);

    expect(result.summary.salesRevenue.toNumber()).toBe(8000);
    expect(result.summary.purchasesTotal.toNumber()).toBe(20000); // 4 × 5000
    expect(result.summary.debtCollected.toNumber()).toBe(3000);
    expect(result.summary.suppliersPaid.toNumber()).toBe(20000);
    expect(result.summary.returnsValue.toNumber()).toBe(4000);
  });

  it("returns zero summary for an empty day", async () => {
    vi.mocked(prisma.sale.findMany).mockResolvedValue([]);
    vi.mocked(prisma.purchase.findMany).mockResolvedValue([]);
    vi.mocked(prisma.debtCollection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supplierPayment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.return.findMany).mockResolvedValue([]);

    const result = await getDayBook(new Date("2026-06-01"));
    expect(result.summary.salesRevenue.toNumber()).toBe(0);
    expect(result.summary.purchasesTotal.toNumber()).toBe(0);
  });
});
