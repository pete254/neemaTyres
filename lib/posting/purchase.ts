import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { computeWac } from "./wac";
import { appendLedgerEntry } from "./ledger";
import type { PostPurchaseInput } from "./types";

export async function postPurchase(input: PostPurchaseInput) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplierId: input.supplierId ?? null,
        date: input.date,
        terms: input.terms,
        recordedById: input.recordedById,
      },
    });

    let purchaseTotalCost = new Decimal(0);

    for (const line of input.lines) {
      const unitCost = line.unitCost;
      const lineTotal = unitCost.mul(line.qty);
      purchaseTotalCost = purchaseTotalCost.plus(lineTotal);

      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: line.variantId },
        select: { qtyOnHand: true, wacCost: true },
      });

      const { qty: newQty, wac: newWac } = computeWac(
        { qty: variant.qtyOnHand, wac: new Decimal(variant.wacCost.toString()) },
        line.qty,
        unitCost
      );

      await tx.purchaseLine.create({
        data: {
          purchaseId: purchase.id,
          variantId: line.variantId,
          qty: line.qty,
          unitCost: unitCost.toDecimalPlaces(2),
          lineTotal: lineTotal.toDecimalPlaces(2),
        },
      });

      await tx.productVariant.update({
        where: { id: line.variantId },
        data: {
          qtyOnHand: newQty,
          wacCost: newWac.toDecimalPlaces(2),
        },
      });
    }

    // CREDIT purchases post to supplier ledger; CASH/FREE are already settled
    if (input.terms === "CREDIT" && input.supplierId) {
      await appendLedgerEntry(
        tx,
        input.supplierId,
        input.date,
        `Purchase receipt ${purchase.id}`,
        purchaseTotalCost,
        new Decimal(0)
      );
    }

    return tx.purchase.findUniqueOrThrow({
      where: { id: purchase.id },
      include: { lines: true },
    });
  });
}
