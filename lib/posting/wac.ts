import Decimal from "decimal.js";

export interface WacState {
  qty: number;
  wac: Decimal;
}

/**
 * Recomputes WAC after receiving incomingQty units at incomingCost each.
 *
 * If newQty === 0 the wac is left unchanged (preserve last known cost).
 *
 * FREE receipts (incomingCost = 0) add quantity but leave the WAC unchanged:
 * free bonus stock must not deflate the cost basis of paid stock. (Business rule
 * — the free units are simply carried at the current average cost.)
 *
 * Negative-stock guard: when on-hand is at or below zero (the item was oversold
 * before its supplying purchase was entered), the pre-existing negative quantity
 * represents no real inventory and must NOT be averaged in — doing so divides the
 * incoming cost over too few units and inflates the WAC (e.g. buy 20 @18,000 while
 * at -6 on hand would otherwise yield 360,000/14 ≈ 25,714 instead of 18,000). In
 * that case the received units establish the cost basis directly.
 */
export function computeWac(
  current: WacState,
  incomingQty: number,
  incomingCost: Decimal
): WacState {
  const newQty = current.qty + incomingQty;
  if (newQty === 0) return { qty: 0, wac: current.wac };

  // FREE receipt: quantity only, cost unchanged.
  if (incomingCost.lte(0)) {
    return { qty: newQty, wac: current.wac };
  }

  if (current.qty <= 0) {
    return { qty: newQty, wac: incomingCost };
  }

  const newWac = new Decimal(current.qty)
    .mul(current.wac)
    .plus(new Decimal(incomingQty).mul(incomingCost))
    .div(newQty);

  return { qty: newQty, wac: newWac };
}
