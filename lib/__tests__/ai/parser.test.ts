import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Google GenAI SDK ─────────────────────────────────────────────────────
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => {
  class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent };
    chats = { create: vi.fn() };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    FunctionCallingConfigMode: { ANY: "ANY", AUTO: "AUTO", NONE: "NONE", MODE_UNSPECIFIED: "MODE_UNSPECIFIED" },
    Type: {
      STRING: "STRING",
      NUMBER: "NUMBER",
      INTEGER: "INTEGER",
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      BOOLEAN: "BOOLEAN",
    },
  };
});

// ── Mock Prisma ───────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    sizeAlias: { findFirst: vi.fn() },
    productVariant: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
    supplier: { findFirst: vi.fn() },
  },
}));

// ── Mock posting functions ────────────────────────────────────────────────────
const mockPostSale = vi.hoisted(() => vi.fn());
const mockPostPurchase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/posting/sale", () => ({ postSale: mockPostSale }));
vi.mock("@/lib/posting/purchase", () => ({ postPurchase: mockPostPurchase }));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { parseEntryMessage } from "@/lib/ai/parser";
import { resolveTransactions } from "@/lib/ai/resolver";
import { parseEntry, confirmEntry } from "@/lib/ai/entryAgent";
import type { RawTransaction, DraftSale, Draft } from "@/lib/ai/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date("2026-06-27T00:00:00.000Z");

function makeParseResponse(transactions: RawTransaction[]) {
  return {
    functionCalls: [{ name: "parse_transactions", args: { transactions } }],
    text: "",
  };
}

const mockRoadshineAP = {
  id: "v-ap",
  sizeCanonical: "11R20",
  position: "AP",
  subLabel: null,
  brand: { id: "b1", name: "Roadshine" },
  referenceSellPrice: null,
};

const mockRoadshineDiff = {
  id: "v-diff",
  sizeCanonical: "11R20",
  position: "DIFF",
  subLabel: null,
  brand: { id: "b1", name: "Roadshine" },
  referenceSellPrice: null,
};

const mockLinglong = {
  id: "v-ll",
  sizeCanonical: "19.5",
  position: "AP",
  subLabel: "small",
  brand: { id: "b2", name: "Linglong" },
  referenceSellPrice: { toString: () => "18500" },
};

const mockSizeAlias11R = { id: "sa1", alias: "11R", sizeCanonical: "11R20" };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Phase 7 AI — parser tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC1: Single-transaction clean
  // ─────────────────────────────────────────────────────────────────────────────
  it("TC1 — single sale, 2 lines, 2 payments summing to line total", async () => {
    // 2 Roadshine AP @ 23,000 + 2 Roadshine Diff @ 26,000 = 98,000
    // MPESA 50,000 + DEBT (balance 48,000)
    const rawTx: RawTransaction = {
      type: "sale",
      date: "2026-06-27",
      customerName: "Kimani",
      lines: [
        { raw: "2 Roadshine AP at 23,000", qty: 2, sizeAlias: "11R", brandName: "Roadshine", position: "AP", unitPrice: 23000 },
        { raw: "2 Roadshine Diff at 26,000", qty: 2, sizeAlias: "11R", brandName: "Roadshine", position: "DIFF", unitPrice: 26000 },
      ],
      payments: [
        { channel: "MPESA", amount: 50000 },
        { channel: "DEBT", isBalance: true },
      ],
    };

    mockGenerateContent.mockResolvedValue(makeParseResponse([rawTx]));
    vi.mocked(prisma.sizeAlias.findFirst).mockResolvedValue(mockSizeAlias11R as never);
    vi.mocked(prisma.productVariant.findMany)
      .mockResolvedValueOnce([mockRoadshineAP] as never)
      .mockResolvedValueOnce([mockRoadshineDiff] as never);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([{ id: "cust-k", name: "Kimani" }] as never);

    const parsed = await parseEntryMessage(
      "Kimani 2 Roadshine AP at 23,000 and 2 Roadshine Diff at 26,000, 50,000 mum rest debt",
      TODAY
    );
    expect(parsed.transactions).toHaveLength(1);

    const { drafts, gaps } = await resolveTransactions(parsed.transactions);
    expect(gaps).toHaveLength(0);
    expect(drafts).toHaveLength(1);

    const draft = drafts[0] as DraftSale;
    expect(draft.type).toBe("sale");
    expect(draft.lines).toHaveLength(2);
    expect(draft.lineTotal).toBe(98000); // 2*23000 + 2*26000

    const mpesa = draft.payments.find((p) => p.channel === "MPESA");
    const debt = draft.payments.find((p) => p.channel === "DEBT");
    expect(mpesa?.amount).toBe(50000);
    expect(debt?.amount).toBe(48000); // balance = 98000 - 50000
    expect(debt?.isBalance).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC2: Multi-transaction / multi-date
  // ─────────────────────────────────────────────────────────────────────────────
  it("TC2 — one message → 4 drafts on 2 different dates", async () => {
    const satDate = "2026-06-21";
    const monDate = "2026-06-22";

    const rawTxs: RawTransaction[] = [
      {
        type: "purchase",
        date: satDate,
        supplierName: "Roadshine Imports",
        terms: "CREDIT",
        lines: [{ raw: "10 Roadshine AP", qty: 10, sizeAlias: "11R", brandName: "Roadshine", position: "AP", unitCost: 18000 }],
      },
      {
        type: "sale",
        date: monDate,
        customerName: "Alice",
        lines: [{ raw: "1 Roadshine AP", qty: 1, sizeAlias: "11R", brandName: "Roadshine", position: "AP", unitPrice: 23000 }],
        payments: [{ channel: "CASH", amount: 23000 }],
      },
      {
        type: "sale",
        date: monDate,
        customerName: "Bob",
        lines: [{ raw: "2 Roadshine Diff", qty: 2, sizeAlias: "11R", brandName: "Roadshine", position: "DIFF", unitPrice: 26000 }],
        payments: [{ channel: "MPESA", amount: 52000 }],
      },
      {
        type: "sale",
        date: monDate,
        customerName: "Carol",
        lines: [{ raw: "1 Roadshine Diff", qty: 1, sizeAlias: "11R", brandName: "Roadshine", position: "DIFF", unitPrice: 26000 }],
        payments: [{ channel: "DEBT", amount: 26000 }],
      },
    ];

    mockGenerateContent.mockResolvedValue(makeParseResponse(rawTxs));
    vi.mocked(prisma.sizeAlias.findFirst).mockResolvedValue(mockSizeAlias11R as never);
    vi.mocked(prisma.productVariant.findMany)
      .mockResolvedValueOnce([mockRoadshineAP] as never)
      .mockResolvedValueOnce([mockRoadshineAP] as never)
      .mockResolvedValueOnce([mockRoadshineDiff] as never)
      .mockResolvedValueOnce([mockRoadshineDiff] as never);
    vi.mocked(prisma.supplier.findFirst).mockResolvedValue({
      id: "sup1",
      name: "Roadshine Imports",
      openingBalance: { toString: () => "0" },
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.customer.findMany)
      .mockResolvedValueOnce([{ id: "c1", name: "Alice" }] as never)
      .mockResolvedValueOnce([{ id: "c2", name: "Bob" }] as never)
      .mockResolvedValueOnce([{ id: "c3", name: "Carol" }] as never);

    const parsed = await parseEntryMessage("...multi-date message...", TODAY);
    expect(parsed.transactions).toHaveLength(4);

    const { drafts, gaps } = await resolveTransactions(parsed.transactions);
    expect(gaps).toHaveLength(0);
    expect(drafts).toHaveLength(4);

    expect(drafts[0].type).toBe("purchase");
    expect(drafts[0].date.toISOString().slice(0, 10)).toBe(satDate);
    expect(drafts[1].date.toISOString().slice(0, 10)).toBe(monDate);
    expect(drafts[2].date.toISOString().slice(0, 10)).toBe(monDate);
    expect(drafts[3].date.toISOString().slice(0, 10)).toBe(monDate);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC3: Partial payment — price gap when not given
  // ─────────────────────────────────────────────────────────────────────────────
  it("TC3 — partial payment without price → gap for unitPrice", async () => {
    const rawTx: RawTransaction = {
      type: "sale",
      date: "2026-06-27",
      customerName: "Githinji",
      lines: [
        // No unitPrice
        { raw: "1 11R Roadshine AP on debt", qty: 1, sizeAlias: "11R", brandName: "Roadshine", position: "AP" },
      ],
      payments: [
        { channel: "MPESA", amount: 8000 },
        { channel: "DEBT", isBalance: true },
      ],
    };

    mockGenerateContent.mockResolvedValue(makeParseResponse([rawTx]));
    vi.mocked(prisma.sizeAlias.findFirst).mockResolvedValue(mockSizeAlias11R as never);
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([mockRoadshineAP] as never);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([{ id: "cust-g", name: "Githinji" }] as never);

    const parsed = await parseEntryMessage(
      "sold Githinji 1 11R Roadshine AP on debt, paid 8,000 to mum, balance debt",
      TODAY
    );
    const { drafts, gaps } = await resolveTransactions(parsed.transactions);

    expect(gaps.some((g) => g.field === "unitPrice")).toBe(true);
    expect(drafts).toHaveLength(1);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC4: Gap-asking — purchase with no supplier / cost / terms
  // ─────────────────────────────────────────────────────────────────────────────
  it("TC4 — purchase missing supplier, terms, and cost → 3+ gaps, nothing posted", async () => {
    const rawTx: RawTransaction = {
      type: "purchase",
      date: "2026-06-27",
      // No supplierName, no terms
      lines: [
        // No unitCost
        { raw: "4 Roadshine AP", qty: 4, sizeAlias: "11R", brandName: "Roadshine", position: "AP" },
      ],
    };

    mockGenerateContent.mockResolvedValue(makeParseResponse([rawTx]));
    vi.mocked(prisma.sizeAlias.findFirst).mockResolvedValue(mockSizeAlias11R as never);
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([mockRoadshineAP] as never);

    const parsed = await parseEntryMessage("bought 4 Roadshine AP", TODAY);
    const { gaps } = await resolveTransactions(parsed.transactions);

    expect(gaps.some((g) => g.field === "supplierName")).toBe(true);
    expect(gaps.some((g) => g.field === "terms")).toBe(true);
    expect(gaps.some((g) => g.field === "unitCost")).toBe(true);

    expect(mockPostPurchase).not.toHaveBeenCalled();
    expect(mockPostSale).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC5: "stock price" → unit price from referenceSellPrice
  // ─────────────────────────────────────────────────────────────────────────────
  it("TC5 — 'stock price' keyword → unitPrice resolved from referenceSellPrice", async () => {
    const rawTx: RawTransaction = {
      type: "sale",
      date: "2026-06-27",
      customerName: "Matheri",
      lines: [
        {
          raw: "1 Linglong 19.5 small, mum, stock price",
          qty: 1,
          sizeAlias: "19.5",
          brandName: "Linglong",
          position: "AP",
          useStockPrice: true,
          // NO unitPrice
        },
      ],
      payments: [{ channel: "MPESA", isBalance: true }],
    };

    mockGenerateContent.mockResolvedValue(makeParseResponse([rawTx]));
    vi.mocked(prisma.sizeAlias.findFirst).mockResolvedValue({
      id: "sa2",
      alias: "19.5",
      sizeCanonical: "19.5",
    } as never);
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([mockLinglong] as never);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([{ id: "cust-m", name: "Matheri" }] as never);

    const parsed = await parseEntryMessage(
      "Matheri 1 Linglong 19.5 small, mum, stock price",
      TODAY
    );
    const { drafts, gaps } = await resolveTransactions(parsed.transactions);

    expect(gaps).toHaveLength(0);
    const draft = drafts[0] as DraftSale;
    expect(draft.lines[0].unitPrice).toBe(18500);
    expect(draft.lineTotal).toBe(18500);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC6: Ambiguous variant (no position given, multiple variants in DB)
  // ─────────────────────────────────────────────────────────────────────────────
  it("TC6 — Roadshine 11R with no position → multipleFound → gap for position", async () => {
    const rawTx: RawTransaction = {
      type: "sale",
      date: "2026-06-27",
      customerName: "Kimani",
      lines: [
        {
          raw: "1 Roadshine 11R",
          qty: 1,
          sizeAlias: "11R",
          brandName: "Roadshine",
          // position intentionally omitted
          unitPrice: 23000,
        },
      ],
      payments: [{ channel: "CASH", amount: 23000 }],
    };

    mockGenerateContent.mockResolvedValue(makeParseResponse([rawTx]));
    vi.mocked(prisma.sizeAlias.findFirst).mockResolvedValue(mockSizeAlias11R as never);
    // DB returns both AP and DIFF — ambiguous
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([
      mockRoadshineAP,
      mockRoadshineDiff,
    ] as never);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([{ id: "cust-k", name: "Kimani" }] as never);

    const parsed = await parseEntryMessage("Kimani 1 Roadshine 11R at 23,000 cash", TODAY);
    const { drafts, gaps } = await resolveTransactions(parsed.transactions);

    const posGap = gaps.find((g) => g.field === "position");
    expect(posGap).toBeDefined();
    expect(posGap?.question).toContain("Roadshine");

    const draft = drafts[0] as DraftSale;
    expect(draft.lines[0].positionAmbiguous).toBe(true);
    expect(draft.lines[0].variantId).toBeUndefined();

    expect(mockPostSale).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TC7: Confirm gate — no DB write before explicit confirm
  // ─────────────────────────────────────────────────────────────────────────────
  it("TC7 — parseEntry does NOT call postSale; confirmEntry DOES call postSale via Phase 3", async () => {
    const rawTx: RawTransaction = {
      type: "sale",
      date: "2026-06-27",
      customerName: "Kimani",
      lines: [
        { raw: "1 Roadshine AP", qty: 1, sizeAlias: "11R", brandName: "Roadshine", position: "AP", unitPrice: 23000 },
      ],
      payments: [{ channel: "CASH", amount: 23000 }],
    };

    mockGenerateContent.mockResolvedValue(makeParseResponse([rawTx]));
    vi.mocked(prisma.sizeAlias.findFirst).mockResolvedValue(mockSizeAlias11R as never);
    vi.mocked(prisma.productVariant.findMany).mockResolvedValue([mockRoadshineAP] as never);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([{ id: "cust-k", name: "Kimani" }] as never);

    // Parse phase — no posting
    const parseResult = await parseEntry("Kimani 1 Roadshine AP at 23,000 cash", TODAY);
    expect(parseResult.status).toBe("confirm");
    expect(mockPostSale).not.toHaveBeenCalled();
    expect(mockPostPurchase).not.toHaveBeenCalled();

    // Confirm phase — postSale called via Phase 3 posting function
    mockPostSale.mockResolvedValue({ id: "sale-1" });
    const confirmResult = await confirmEntry(parseResult.drafts as Draft[], "user-1");
    expect(confirmResult.status).toBe("posted");
    expect(mockPostSale).toHaveBeenCalledTimes(1);

    // Verify it called Phase 3 input shape, not a raw DB write
    const callArg = mockPostSale.mock.calls[0][0];
    expect(callArg).toHaveProperty("customerId");
    expect(callArg).toHaveProperty("lines");
    expect(callArg).toHaveProperty("payments");
    expect(callArg).toHaveProperty("recordedById", "user-1");
    expect(callArg.lines[0]).toHaveProperty("unitPrice");
    expect(callArg.lines[0].unitPrice.toString()).toBe("23000");
  });
});
