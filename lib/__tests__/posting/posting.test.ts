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
  $queryRaw: vi.fn(),
  purchase: { create: vi.fn(), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
  purchaseLine: { create: vi.fn(), findUniqueOrThrow: vi.fn(), deleteMany: vi.fn() },
  productVariant: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  sale: { create: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
  saleLine: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  payment: { create: vi.fn(), aggregate: vi.fn(), deleteMany: vi.fn() },
  debtCollection: { create: vi.fn(), aggregate: vi.fn() },
  supplierPayment: { create: vi.fn() },
  ledgerEntry: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
  exceptionFlag: { create: vi.fn(), deleteMany: vi.fn() },
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

describe("deletePurchase — WAC when the purchased units are already sold", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("keeps the last known WAC instead of zeroing it", async () => {
    const { deletePurchase } = await import("@/lib/posting/purchase");

    mockTx.purchase.findUniqueOrThrow.mockResolvedValue({
      id: "purch-del", terms: "CASH", supplierId: null, date: new Date(),
      lines: [{ variantId: "var-1", qty: 2, unitCost: { toString: () => "25000" }, lineTotal: { toString: () => "50000" } }],
    });
    // Both units already sold: on hand 0, WAC 25,000
    mockTx.productVariant.findUniqueOrThrow.mockResolvedValue(makeVariant(0, 25000));
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.purchaseLine.deleteMany.mockResolvedValue({});
    mockTx.purchase.delete.mockResolvedValue({});

    await deletePurchase("purch-del");

    const data = mockTx.productVariant.update.mock.calls[0][0].data;
    expect(data.qtyOnHand).toBe(-2);
    expect(data.wacCost.toFixed(2)).toBe("25000.00");
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

  it("refuses a sale that would drive stock negative, and writes nothing to stock", async () => {
    const { postSale, InsufficientStockError } = await import("@/lib/posting/sale");

    mockTx.sale.findFirst.mockResolvedValue(null);
    mockTx.sale.create.mockResolvedValue({ id: "sale-3" });
    // Only 1 in stock, selling 3
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(1, 15000));

    const attempt = postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 3, unitPrice: dec(18000) }],
      payments: [{ channel: "CASH", amount: dec(54000) }],
    });

    await expect(attempt).rejects.toBeInstanceOf(InsufficientStockError);
    await expect(attempt).rejects.toThrow(/1 in stock, trying to sell 3/);
    expect(mockTx.productVariant.update).not.toHaveBeenCalled();
    expect(mockTx.saleLine.create).not.toHaveBeenCalled();
  });

  it("allows selling exactly what is in stock (to zero)", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    mockTx.sale.findFirst.mockResolvedValue(null);
    mockTx.sale.create.mockResolvedValue({ id: "sale-3b" });
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(2, 15000));
    mockTx.saleLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.payment.create.mockResolvedValue({});
    mockTx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale-3b", lines: [], payments: [] });

    await postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 2, unitPrice: dec(18000) }],
      payments: [{ channel: "CASH", amount: dec(36000) }],
    });

    expect(mockTx.productVariant.update.mock.calls[0][0].data.qtyOnHand).toBe(0);
    expect(mockTx.exceptionFlag.create).not.toHaveBeenCalled();
  });

  it("still allows off-inventory items to go negative, with a NEGATIVE_STOCK flag", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    mockTx.sale.findFirst.mockResolvedValue(null);
    mockTx.sale.create.mockResolvedValue({ id: "sale-3c" });
    mockTx.productVariant.findUnique.mockResolvedValue({ ...makeVariant(1, 15000), isOffInventory: true });
    mockTx.saleLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.payment.create.mockResolvedValue({});
    mockTx.exceptionFlag.create.mockResolvedValue({});
    mockTx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale-3c", lines: [], payments: [] });

    await postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 3, unitPrice: dec(18000) }],
      payments: [{ channel: "CASH", amount: dec(54000) }],
    });

    expect(mockTx.productVariant.update.mock.calls[0][0].data.qtyOnHand).toBe(-2);
    expect(mockTx.exceptionFlag.create.mock.calls[0][0].data.flagType).toBe("NEGATIVE_STOCK");
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

describe("posting — variant row locks", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("locks each sold variant once, in sorted order, before reading stock", async () => {
    const { postSale } = await import("@/lib/posting/sale");

    mockTx.sale.create.mockResolvedValue({ id: "sale-lock" });
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(10, 15000));
    mockTx.saleLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.payment.create.mockResolvedValue({});
    mockTx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale-lock", lines: [], payments: [] });

    await postSale({
      date: new Date(),
      recordedById: "user-1",
      lines: [
        { variantId: "var-b", qty: 1, unitPrice: dec(10000) },
        { variantId: "var-a", qty: 1, unitPrice: dec(10000) },
        { variantId: "var-b", qty: 1, unitPrice: dec(10000) },
      ],
      payments: [{ channel: "CASH", amount: dec(30000) }],
    });

    // Tagged-template calls: [strings, id] — one lock per distinct variant, sorted.
    const lockedIds = mockTx.$queryRaw.mock.calls.map((c) => c[1]);
    expect(lockedIds).toEqual(["var-a", "var-b"]);
    expect(mockTx.$queryRaw.mock.calls[0][0].join("?")).toContain("FOR UPDATE");
    expect(mockTx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      mockTx.productVariant.findUnique.mock.invocationCallOrder[0]
    );
  });

  it("locks purchased variants before computing WAC", async () => {
    const { postPurchase } = await import("@/lib/posting/purchase");

    mockTx.purchase.create.mockResolvedValue({ id: "purch-lock" });
    mockTx.productVariant.findUniqueOrThrow.mockResolvedValue(makeVariant(3, 22000));
    mockTx.purchaseLine.create.mockResolvedValue({});
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.purchase.findUniqueOrThrow.mockResolvedValue({ id: "purch-lock", lines: [] });

    await postPurchase({
      terms: "CASH",
      date: new Date(),
      recordedById: "user-1",
      lines: [{ variantId: "var-1", qty: 2, unitCost: dec(20000) }],
    });

    expect(mockTx.$queryRaw).toHaveBeenCalledOnce();
    expect(mockTx.$queryRaw.mock.calls[0][1]).toBe("var-1");
  });
});

describe("replaceSale — edit is all-or-nothing", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("deletes and re-posts inside ONE transaction, so a refused edit rolls back the delete", async () => {
    const { replaceSale, InsufficientStockError } = await import("@/lib/posting/sale");
    const { prisma } = await import("@/lib/prisma");

    mockTx.saleLine.findMany.mockResolvedValue([{ variantId: "var-old" }]);
    mockTx.sale.findUniqueOrThrow.mockResolvedValueOnce({ id: "old-sale", lines: [{ variantId: "var-old", qty: 1 }] });
    mockTx.productVariant.update.mockResolvedValue({});
    mockTx.exceptionFlag.deleteMany.mockResolvedValue({});
    mockTx.payment.deleteMany.mockResolvedValue({});
    mockTx.saleLine.deleteMany.mockResolvedValue({});
    mockTx.sale.delete.mockResolvedValue({});
    mockTx.sale.findFirst.mockResolvedValue(null);
    mockTx.sale.create.mockResolvedValue({ id: "new-sale" });
    mockTx.productVariant.findUnique.mockResolvedValue(makeVariant(0, 15000)); // new tyre has none

    await expect(
      replaceSale("old-sale", {
        date: new Date(),
        recordedById: "user-1",
        lines: [{ variantId: "var-new", qty: 1, unitPrice: dec(18000) }],
        payments: [{ channel: "CASH", amount: dec(18000) }],
      })
    ).rejects.toBeInstanceOf(InsufficientStockError);

    // One transaction wraps both steps — the throw makes Postgres undo the delete.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.sale.delete).toHaveBeenCalledOnce();
    // Old and new tyres locked together, sorted, before anything else.
    expect(mockTx.$queryRaw.mock.calls.slice(0, 2).map((c) => c[1])).toEqual(["var-new", "var-old"]);
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
