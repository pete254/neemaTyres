import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { computeWac } from "@/lib/posting/wac";

// toFixed preserves trailing zeros; toDecimalPlaces(2).toString() strips them
const d2 = (d: Decimal) => d.toFixed(2);

describe("computeWac — pure unit tests", () => {
  it("returns 0 qty and unchanged wac when newQty would be 0", () => {
    const result = computeWac({ qty: 0, wac: new Decimal(0) }, 0, new Decimal(5000));
    expect(result.qty).toBe(0);
    expect(result.wac.toString()).toBe("0");
  });

  it("sets initial wac from first receipt", () => {
    const result = computeWac({ qty: 0, wac: new Decimal(0) }, 4, new Decimal(9500));
    expect(result.qty).toBe(4);
    expect(d2(result.wac)).toBe("9500.00");
  });

  /**
   * 315/80R22.5 Grandstone AP — real report figure
   * Buy 3 @ 22,000 then 6 @ 19,400 → WAC = 20,266.67
   */
  it("315 Grandstone AP → WAC 20,266.67 after two receipts", () => {
    const step1 = computeWac({ qty: 0, wac: new Decimal(0) }, 3, new Decimal(22000));
    expect(step1.qty).toBe(3);

    const step2 = computeWac(step1, 6, new Decimal(19400));
    expect(step2.qty).toBe(9);
    // (3×22000 + 6×19400) / 9 = 182400 / 9 = 20266.666…
    expect(d2(step2.wac)).toBe("20266.67");
  });

  /**
   * 11R22.5 Grandstone AP — real report figure
   * Buy 3 @ 19,000 then 4 @ 18,425 → WAC = 18,671.43
   */
  it("11R Grandstone AP → WAC 18,671.43 after two receipts", () => {
    const step1 = computeWac({ qty: 0, wac: new Decimal(0) }, 3, new Decimal(19000));
    const step2 = computeWac(step1, 4, new Decimal(18425));
    expect(step2.qty).toBe(7);
    // (3×19000 + 4×18425) / 7 = (57000 + 73700) / 7 = 130700 / 7 = 18671.428…
    expect(d2(step2.wac)).toBe("18671.43");
  });

  /**
   * 7.00R16 Everton — FREE receipt adds quantity but must NOT change WAC.
   * Buy 2 @ 9,500 (paid), then receive 2 @ 0 (FREE) → qty 4, WAC stays 9,500.
   * Free bonus stock is not allowed to deflate the cost of paid stock.
   */
  it("FREE receipt adds qty but leaves WAC unchanged", () => {
    const step1 = computeWac({ qty: 0, wac: new Decimal(0) }, 2, new Decimal(9500));
    expect(step1.qty).toBe(2);
    expect(d2(step1.wac)).toBe("9500.00");

    // FREE receipt: unitCost = 0
    const step2 = computeWac(step1, 2, new Decimal(0));
    expect(step2.qty).toBe(4);
    expect(d2(step2.wac)).toBe("9500.00");
  });

  it("FREE receipt while oversold adds qty and keeps the prior WAC", () => {
    // At -3 on hand, wac 6,500; receive 8 free → qty 5, wac still 6,500 (not 0).
    const after = computeWac({ qty: -3, wac: new Decimal(6500) }, 8, new Decimal(0));
    expect(after.qty).toBe(5);
    expect(d2(after.wac)).toBe("6500.00");
  });

  it("negative incoming qty (return to stock) also recalculates correctly", () => {
    // Start: 6 @ 20,000. Return 2 at 18,000 (their original cost)
    const after = computeWac({ qty: 6, wac: new Decimal(20000) }, 2, new Decimal(18000));
    expect(after.qty).toBe(8);
    // (6×20000 + 2×18000) / 8 = (120000 + 36000) / 8 = 156000 / 8 = 19500
    expect(d2(after.wac)).toBe("19500.00");
  });

  it("preserves wac when net qty drops to zero (sell all stock)", () => {
    // Start 3 @ 15000, sell 3 → qty becomes 0
    const after = computeWac({ qty: 3, wac: new Decimal(15000) }, -3, new Decimal(0));
    expect(after.qty).toBe(0);
    expect(d2(after.wac)).toBe("15000.00");
  });

  /**
   * Negative-stock guard — 19.5 Blacklion DIFF, the real distortion case.
   * Oversold to -6, then the supplying purchase of 20 @ 18,000 is entered.
   * The 6 negative (oversold) units have no inventory value, so WAC must be the
   * received cost 18,000 — NOT 360,000/14 ≈ 25,714 as the naive average gives.
   */
  it("oversold then purchase covers it → WAC = received cost (not distorted)", () => {
    const after = computeWac({ qty: -6, wac: new Decimal(25000) }, 20, new Decimal(18000));
    expect(after.qty).toBe(14);
    expect(d2(after.wac)).toBe("18000.00");
  });

  it("still oversold after a receipt → keeps received cost as basis", () => {
    // At -30, receive 20 @ 18,000 → still -10 on hand; carries the received cost.
    const after = computeWac({ qty: -30, wac: new Decimal(25000) }, 20, new Decimal(18000));
    expect(after.qty).toBe(-10);
    expect(d2(after.wac)).toBe("18000.00");
  });
});
