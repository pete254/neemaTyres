import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { computeWac } from "./wac";
import { appendLedgerEntry } from "./ledger";
import { variantLabel } from "./label";
import type { PostReturnInput } from "./types";

export async function postReturn(input: PostReturnInput) {
  return prisma.$transaction(async (tx) => {
    const ret = await tx.return.create({
      data: {
        type: input.type,
        originalSaleLineId: input.originalSaleLineId ?? null,
        originalPurchaseLineId: input.originalPurchaseLineId ?? null,
        variantId: input.variantId,
        qty: input.qty,
        unitValue: input.unitValue.toDecimalPlaces(2),
        date: input.date,
        recordedById: input.recordedById,
      },
    });

    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: input.variantId },
      select: {
        qtyOnHand: true,
        wacCost: true,
        sizeCanonical: true,
        subLabel: true,
        position: true,
        brand: { select: { name: true } },
      },
    });

    if (input.type === "SALE_RETURN") {
      // Stock comes back; recompute WAC with the returned units
      const { qty: newQty, wac: newWac } = computeWac(
        { qty: variant.qtyOnHand, wac: new Decimal(variant.wacCost.toString()) },
        input.qty,
        input.unitValue
      );
      await tx.productVariant.update({
        where: { id: input.variantId },
        data: { qtyOnHand: newQty, wacCost: newWac.toDecimalPlaces(2) },
      });
    } else {
      // PURCHASE_RETURN: stock leaves, post credit to supplier ledger
      await tx.productVariant.update({
        where: { id: input.variantId },
        data: { qtyOnHand: variant.qtyOnHand - input.qty },
      });

      // Find the supplier from the original purchase line
      if (input.originalPurchaseLineId) {
        const originalLine = await tx.purchaseLine.findUniqueOrThrow({
          where: { id: input.originalPurchaseLineId },
          include: { purchase: { select: { supplierId: true, terms: true } } },
        });
        if (
          originalLine.purchase.supplierId &&
          originalLine.purchase.terms === "CREDIT"
        ) {
          const returnValue = input.unitValue.mul(input.qty);
          await appendLedgerEntry(
            tx,
            originalLine.purchase.supplierId,
            input.date,
            input.note?.trim() || `Purchase return — ${input.qty}× ${variantLabel(variant)}`,
            new Decimal(0),
            returnValue
          );
        }
      }
    }

    return ret;
  });
}
