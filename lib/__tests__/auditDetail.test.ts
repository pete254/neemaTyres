import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  describeSaleCreated,
  describeSaleEdited,
  describePurchaseEdited,
  describeSupplierPaymentEdited,
  type SaleSnap,
} from "@/lib/auditDetail";

const sale: SaleSnap = {
  invoiceNo: "2026-012",
  date: "12 Mar 2026",
  customer: "Walk-in",
  lines: [{ label: "315/80R22.5 Blackhawk", qty: 2, price: "18000" }],
  payments: [{ channel: "MPESA", amount: "36000" }],
  total: "36000",
};

describe("audit descriptions", () => {
  it("writes out a new sale in full", () => {
    expect(describeSaleCreated(sale).split("\n")).toEqual([
      "Sale 2026-012 to Walk-in — KES 36,000",
      "12 Mar 2026 · Walk-in",
      "2× 315/80R22.5 Blackhawk @ KES 18,000 = KES 36,000",
      "Paid: M-Pesa KES 36,000 · Total KES 36,000",
    ]);
  });

  it("lists exactly what changed on a sale edit, then the new version", () => {
    const after: SaleSnap = {
      ...sale,
      customer: "John Kamau",
      lines: [
        { label: "315/80R22.5 Blackhawk", qty: 3, price: "17500" },
        { label: "11R22.5 Michelin", qty: 1, price: "25000" },
      ],
      payments: [{ channel: "MPESA", amount: "40000" }, { channel: "DEBT", amount: "37500" }],
      total: "77500",
    };
    const text = describeSaleEdited(sale, after);
    expect(text).toContain("• Customer: Walk-in → John Kamau");
    expect(text).toContain("• 315/80R22.5 Blackhawk: qty 2 → 3");
    expect(text).toContain("• 315/80R22.5 Blackhawk: price KES 18,000 → KES 17,500");
    expect(text).toContain("• Added 1× 11R22.5 Michelin @ KES 25,000");
    expect(text).toContain("• Payment: M-Pesa KES 36,000 → M-Pesa KES 40,000 + Credit KES 37,500");
    expect(text).toContain("• Total: KES 36,000 → KES 77,500");
    expect(text).toContain("Now:\n12 Mar 2026 · John Kamau");
    expect(text).not.toContain("Date:");
  });

  it("says so when an edit changed nothing", () => {
    expect(describeSaleEdited(sale, sale)).toContain("• No changes");
  });

  it("reports removed purchase lines and cost changes", () => {
    const before = {
      date: "1 Mar 2026", supplier: "Tyre World", terms: "Credit", total: "100000",
      lines: [
        { label: "A", qty: 4, price: "20000" },
        { label: "B", qty: 1, price: "20000" },
      ],
    };
    const after = { ...before, terms: "Cash", total: "84000", lines: [{ label: "A", qty: 4, price: "21000" }] };
    const text = describePurchaseEdited(before, after);
    expect(text).toContain("• Terms: Credit → Cash");
    expect(text).toContain("• A: cost KES 20,000 → KES 21,000");
    expect(text).toContain("• Removed 1× B @ KES 20,000");
  });

  it("shows supplier payment amount changes", () => {
    const before = { supplier: "Tyre World", amount: "50000", date: "1 Mar 2026", note: null };
    const text = describeSupplierPaymentEdited(before, { ...before, amount: "45000", note: "short paid" });
    expect(text).toContain("• Amount: KES 50,000 → KES 45,000");
    expect(text).toContain("• Note: — → short paid");
  });
});
