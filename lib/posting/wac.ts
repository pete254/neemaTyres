import Decimal from "decimal.js";

export interface WacState {
  qty: number;
  wac: Decimal;
}

/**
 * Recomputes WAC after receiving incomingQty units at incomingCost each.
 *
 * FREE receipts use incomingCost = 0; they correctly pull the average down.
 * If newQty === 0 the wac is left unchanged (preserve last known cost).
 */
export function computeWac(
  current: WacState,
  incomingQty: number,
  incomingCost: Decimal
): WacState {
  const newQty = current.qty + incomingQty;
  if (newQty === 0) return { qty: 0, wac: current.wac };

  const newWac = new Decimal(current.qty)
    .mul(current.wac)
    .plus(new Decimal(incomingQty).mul(incomingCost))
    .div(newQty);

  return { qty: newQty, wac: newWac };
}
