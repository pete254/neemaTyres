import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { computeWac } from "./wac";
import { appendLedgerEntry } from "./ledger";
import { variantLabel, linesSummary } from "./label";
import type { PostPurchaseInput } from "./types";

export async function deletePurchase(purchaseId: string) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { lines: true },
    });

    let totalCost = new Decimal(0);
    const summaryItems: { qty: number; label: string }[] = [];

    for (const line of purchase.lines) {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: line.variantId },
        select: {
          qtyOnHand: true,
          wacCost: true,
          sizeCanonical: true,
          subLabel: true,
          position: true,
          brand: { select: { name: true } },
        },
      });
      summaryItems.push({ qty: line.qty, label: variantLabel(variant) });

      const lineUnitCost = new Decimal(line.unitCost.toString());
      totalCost = totalCost.plus(new Decimal(line.lineTotal.toString()));

      const restoredQty = variant.qtyOnHand - line.qty;
      let restoredWac: Decimal;
      if (restoredQty <= 0) {
        restoredWac = new Decimal(0);
      } else {
        restoredWac = new Decimal(variant.qtyOnHand)
          .mul(new Decimal(variant.wacCost.toString()))
          .minus(new Decimal(line.qty).mul(lineUnitCost))
          .div(restoredQty)
          .toDecimalPlaces(2);
        if (restoredWac.lt(0)) restoredWac = new Decimal(0);
      }

      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { qtyOnHand: restoredQty, wacCost: restoredWac },
      });
    }

    if (purchase.terms === "CREDIT" && purchase.supplierId) {
      await appendLedgerEntry(
        tx,
        purchase.supplierId,
        purchase.date,
        `Reversal — ${linesSummary(summaryItems)}`,
        new Decimal(0),
        totalCost
      );
    }

    await tx.purchaseLine.deleteMany({ where: { purchaseId } });
    await tx.purchase.delete({ where: { id: purchaseId } });
  });
}

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
    const summaryItems: { qty: number; label: string }[] = [];

    for (const line of input.lines) {
      const unitCost = line.unitCost;
      const lineTotal = unitCost.mul(line.qty);
      purchaseTotalCost = purchaseTotalCost.plus(lineTotal);

      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: line.variantId },
        select: {
          qtyOnHand: true,
          wacCost: true,
          sizeCanonical: true,
          subLabel: true,
          position: true,
          brand: { select: { name: true } },
        },
      });
      summaryItems.push({ qty: line.qty, label: variantLabel(variant) });

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
        `Purchase — ${linesSummary(summaryItems)}`,
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
