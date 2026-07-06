/**
 * Posting engine integration-style tests using a Prisma mock.
 * Tests verify business rules: WAC updates, payment splits, debt boundary,
 * negative-stock flagging, and supplier ledger correctness.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

// ─── Prisma mock ─────────────────────────────────────────────────────────────
// We mock the prisma singleton so posting functions never touch a real DB.
// Each test seeds the mock's return values to match the scenario.

const mockTx = {
  purchase: { create: vi.fn(), findUniqueOrThrow: vi.fn() },
  purchaseLine: { create: vi.fn(), findUniqueOrThrow: vi.fn() },
  productVariant: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  sale: { create: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  saleLine: { create: vi.fn() },
  payment: { create: vi.fn(), aggregate: vi.fn() },
  debtCollection: { create: vi.fn(), aggregate: vi.fn() },
  supplierPayment: { create: vi.fn() },
  ledgerEntry: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
  exceptionFlag: { create: vi.fn() },
  return: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
    payment: { aggregate: vi.fn() },
    debtCollection: { aggregate: vi.fn() },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dec(v: number) { return new Decimal(v); }

function makeVariant(qtyOnHand: number, wacCost: number) {
  return {
    id: "var-1",
    qtyOnHand,
    wacCost: { toString: () => String(wacCost) },
    referenceSellPrice: null,
    isOffInventory: false,
    sizeCanonical: "315/80R22.5",
    subLabel: null,
    position: "NONE",
    brand: { name: "Bridgestone" },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("postPurchase — WAC and ledger", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("updates variant WAC correctly on a single receipt", async () => {
    const { postPurchase } = await import("@/lib/posting/purchase");

    mockTx.purchase.create.mockResolvedValue({ id: "purch-1" });
    mockTx.productVariant.findUniqueOrThrow.mockResolvedValue(makeVariant(3, 22000));
    mockTx.purchaseLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.purchase.findUniqueOrThrow.mockResolvedValue({ id: "purch-1", lines: [] });

    await postPurchase({
      date: new Date("2024-01-01"),
      terms: "CASH",
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 6, unitCost: dec(19400) }],
    });

    const updateCall = mockTx.productVariant.update.mock.calls[0][0];
    // (3×22000 + 6×19400) / 9 = 182400/9 = 20266.67
    expect(updateCall.data.qtyOnHand).toBe(9);
    expect(updateCall.data.wacCost.toString()).toBe("20266.67");
  });

  it("posts a debit ledger entry for CREDIT purchase", async () => {
    const { postPurchase } = await import("@/lib/posting/purchase");

    mockTx.purchase.create.mockResolvedValue({ id: "purch-2" });
    mockTx.productVariant.findUniqueOrThrow.mockResolvedValue(makeVariant(0, 0));
    mockTx.purchaseLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.purchase.findUniqueOrThrow.mockResolvedValue({ id: "purch-2", lines: [] });
    mockTx.ledgerEntry.create.mockResolvedValue({ id: "le-1" });
    // recompute reads all entries then updates each running balance
    mockTx.ledgerEntry.findMany.mockResolvedValue([
      { id: "le-1", debit: { toString: () => "100000" }, credit: { toString: () => "0" } },
    ]);
    mockTx.ledgerEntry.update.mockResolvedValue({});

    await postPurchase({
      supplierId: "sup-1",
      date: new Date("2024-01-01"),
      terms: "CREDIT",
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 4, unitCost: dec(25000) }],
    });

    expect(mockTx.ledgerEntry.create).toHaveBeenCalledOnce();
    const ledgerData = mockTx.ledgerEntry.create.mock.calls[0][0].data;
    expect(Number(ledgerData.debit)).toBe(100000); // 4×25000
    expect(Number(ledgerData.credit)).toBe(0);
    // The final running balance is written by the recompute pass (update), not create.
    expect(mockTx.ledgerEntry.update).toHaveBeenCalledOnce();
    expect(Number(mockTx.ledgerEntry.update.mock.calls[0][0].data.runningBalance)).toBe(100000);
  });

  it("does NOT post a ledger entry for CASH purchase", async () => {
    const { postPurchase } = await import("@/lib/posting/purchase");

    mockTx.purchase.create.mockResolvedValue({ id: "purch-3" });
    mockTx.productVariant.findUniqueOrThrow.mockResolvedValue(makeVariant(0, 0));
    mockTx.purchaseLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.purchase.findUniqueOrThrow.mockResolvedValue({ id: "purch-3", lines: [] });

    await postPurchase({
      date: new Date("2024-01-01"),
      terms: "CASH",
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 2, unitCost: dec(12000) }],
    });

    expect(mockTx.ledgerEntry.create).not.toHaveBeenCalled();
  });
});

describe("postSale — split payment and receivable", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws when payments do not sum to line totals", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    await expect(postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 1, unitPrice: dec(98000) }],
      payments: [
        { channel: "MPESA", amount: dec(50000) },
        { channel: "DEBT", amount: dec(40000) }, // wrong: 50000+40000=90000 ≠ 98000
      ],
    })).rejects.toThrow("Payment total");
  });

  it("Kimani split: 98,000 = 50,000 MPESA + 48,000 DEBT creates two payment rows", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    mockTx.sale.create.mockResolvedValue({ id: "sale-1" });
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(5, 20000));
    mockTx.saleLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.payment.create.mockResolvedValue({});
    mockTx.sale.findUniqueOrThrow.mockResolvedValue({
      id: "sale-1", lines: [], payments: [],
    });

    await postSale({
      customerId: "cust-kimani",
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 1, unitPrice: dec(98000) }],
      payments: [
        { channel: "MPESA", amount: dec(50000) },
        { channel: "DEBT",  amount: dec(48000) },
      ],
    });

    expect(mockTx.payment.create).toHaveBeenCalledTimes(2);
    const channels = mockTx.payment.create.mock.calls.map(
      (c: any[]) => c[0].data.channel
    );
    expect(channels).toContain("MPESA");
    expect(channels).toContain("DEBT");
  });

  it("records unitCostAtSale snapshot from current WAC", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    mockTx.sale.create.mockResolvedValue({ id: "sale-2" });
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(10, 18671));
    mockTx.saleLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.payment.create.mockResolvedValue({});
    mockTx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale-2", lines: [], payments: [] });

    await postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 2, unitPrice: dec(25000) }],
      payments: [{ channel: "CASH", amount: dec(50000) }],
    });

    const saleLineData = mockTx.saleLine.create.mock.calls[0][0].data;
    expect(Number(saleLineData.unitCostAtSale)).toBe(18671);
  });
});

describe("postSale — negative stock and flags", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("allows sale that drives stock negative and creates NEGATIVE_STOCK ExceptionFlag", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    mockTx.sale.create.mockResolvedValue({ id: "sale-3" });
    // Only 1 in stock, selling 3 → goes to -2
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(1, 15000));
    mockTx.saleLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.payment.create.mockResolvedValue({});
    mockTx.exceptionFlag.create.mockResolvedValue({});
    mockTx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale-3", lines: [], payments: [] });

    // Should not throw
    await postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 3, unitPrice: dec(18000) }],
      payments: [{ channel: "CASH", amount: dec(54000) }],
    });

    const updateCall = mockTx.productVariant.update.mock.calls[0][0];
    expect(updateCall.data.qtyOnHand).toBe(-2);

    expect(mockTx.exceptionFlag.create).toHaveBeenCalledOnce();
    const flagData = mockTx.exceptionFlag.create.mock.calls[0][0].data;
    expect(flagData.flagType).toBe("NEGATIVE_STOCK");
  });

  it("flags PRICE_ANOMALY when unitPrice > 2× WAC", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    mockTx.sale.create.mockResolvedValue({ id: "sale-4" });
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(5, 10000));
    mockTx.saleLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.payment.create.mockResolvedValue({});
    mockTx.exceptionFlag.create.mockResolvedValue({});
    mockTx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale-4", lines: [], payments: [] });

    // 7.50R16 "22,000 = 2 tyres" style error: 22000 vs WAC 10000 → anomaly (22000 > 2×10000=20000)
    await postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 1, unitPrice: dec(22000) }],
      payments: [{ channel: "CASH", amount: dec(22000) }],
    });

    expect(mockTx.exceptionFlag.create).toHaveBeenCalledOnce();
    const flagData = mockTx.exceptionFlag.create.mock.calls[0][0].data;
    expect(flagData.flagType).toBe("PRICE_ANOMALY");
  });
});

describe("debt collection — accounting boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("postDebtCollection does not create a Sale row", async () => {
    const { postDebtCollection } = await import("@/lib/posting/debtCollection");
    mockTx.debtCollection.create.mockResolvedValue({ id: "dc-1" });

    await postDebtCollection({
      customerId: "cust-1",
      amount: dec(48000),
      channel: "MPESA",
      date: new Date(),
      recordedById: "user-1",
    });

    expect(mockTx.sale.create).not.toHaveBeenCalled();
    expect(mockTx.debtCollection.create).toHaveBeenCalledOnce();
  });

  it("getCustomerReceivable = DEBT payments − collections", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { getCustomerReceivable } = await import("@/lib/posting/debtCollection");

    (prisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { amount: { toString: () => "48000" } },
    });
    (prisma.debtCollection.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { amount: { toString: () => "20000" } },
    });

    const receivable = await getCustomerReceivable("cust-1");
    expect(receivable.toString()).toBe("28000");
  });
});

describe("supplier ledger — running balance", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // Simulate an in-memory ledger table for one supplier so we can exercise the
  // create + full recompute cycle in appendLedgerEntry.
  function wireLedger(initial: Array<{ id: string; date: Date; debit: string; credit: string }> = []) {
    let seq = initial.length;
    const rows = initial.map((r) => ({ ...r, runningBalance: "0" }));

    mockTx.ledgerEntry.create.mockImplementation(({ data }: any) => {
      const row = {
        id: `e${++seq}`,
        date: data.date,
        debit: data.debit.toString(),
        credit: data.credit.toString(),
        runningBalance: data.runningBalance.toString(),
      };
      rows.push(row);
      return Promise.resolve(row);
    });
    mockTx.ledgerEntry.findMany.mockImplementation(() =>
      Promise.resolve(
        [...rows].sort((a, b) =>
          a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id)
        )
      )
    );
    mockTx.ledgerEntry.update.mockImplementation(({ where, data }: any) => {
      const row = rows.find((r) => r.id === where.id)!;
      row.runningBalance = data.runningBalance.toString();
      return Promise.resolve(row);
    });
    return rows;
  }

  it("purchase + payment + return produce correct running balance sequence", async () => {
    const { appendLedgerEntry } = await import("@/lib/posting/ledger");
    const d = new Date("2026-01-01");
    const rows = wireLedger();

    await appendLedgerEntry(mockTx as any, "sup-1", d, "purchase", dec(200000), dec(0));
    expect(rows.at(-1)!.runningBalance).toBe("200000");

    await appendLedgerEntry(mockTx as any, "sup-1", d, "payment", dec(0), dec(125000));
    expect(rows.at(-1)!.runningBalance).toBe("75000");

    await appendLedgerEntry(mockTx as any, "sup-1", d, "return", dec(0), dec(75000));
    expect(rows.at(-1)!.runningBalance).toBe("0");
  });

  it("keeps balances consistent when a backdated entry is inserted after a later one", async () => {
    const { appendLedgerEntry } = await import("@/lib/posting/ledger");
    // Opening 837k (25 Jun), then a payment 125k (04 Jul) posted first...
    const rows = wireLedger([
      { id: "e1", date: new Date("2026-06-25"), debit: "837000", credit: "0" },
    ]);
    await appendLedgerEntry(mockTx as any, "sup-1", new Date("2026-07-04"), "payment", dec(0), dec(125000));

    // ...then a backdated purchase receipt (01 Jul) is appended AFTER the payment
    // (the exact scenario that corrupted the real ledger: cash→debt edit).
    await appendLedgerEntry(mockTx as any, "sup-1", new Date("2026-07-01"), "purchase", dec(571500), dec(0));

    // Ordered by date, balances must chain correctly: 837k → 1,408.5k → 1,283.5k
    const ordered = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
    expect(ordered.map((r) => r.runningBalance)).toEqual(["837000", "1408500", "1283500"]);
  });
});
