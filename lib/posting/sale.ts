import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type { PostSaleInput } from "./types";

export async function deleteSale(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { lines: true },
    });
    // Restore inventory
    for (const line of sale.lines) {
      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { qtyOnHand: { increment: line.qty } },
      });
    }
    await tx.exceptionFlag.deleteMany({ where: { entityId: saleId } });
    await tx.payment.deleteMany({ where: { saleId } });
    await tx.saleLine.deleteMany({ where: { saleId } });
    await tx.sale.delete({ where: { id: saleId } });
  });
}

const PRICE_ANOMALY_MULTIPLIER = 2;

export async function postSale(input: PostSaleInput) {
  // Validate: payments must sum exactly to totalAmount before entering the transaction
  const paymentsTotal = input.payments.reduce(
    (sum, p) => sum.plus(p.amount),
    new Decimal(0)
  );
  const linesTotal = input.lines.reduce(
    (sum, l) => sum.plus(l.unitPrice.mul(l.qty)),
    new Decimal(0)
  );
  if (!paymentsTotal.equals(linesTotal)) {
    throw new Error(
      `Payment total ${paymentsTotal} does not match sale total ${linesTotal}`
    );
  }

  return prisma.$transaction(async (tx) => {
    const year = input.date.getFullYear();
    const lastInvoice = await tx.sale.findFirst({
      where: { invoiceNo: { startsWith: `${year}-` } },
      orderBy: { invoiceNo: "desc" },
      select: { invoiceNo: true },
    });
    const lastNum = lastInvoice?.invoiceNo ? parseInt(lastInvoice.invoiceNo.split("-")[1], 10) : 0;
    const invoiceNo = `${year}-${String(lastNum + 1).padStart(3, "0")}`;

    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: input.customerId ?? null,
        date: input.date,
        totalAmount: linesTotal.toDecimalPlaces(2),
        recordedById: input.recordedById,
      },
    });

    for (const line of input.lines) {
      const flags: string[] = [];

      // Fetch or auto-create variant
      let variant = await tx.productVariant.findUnique({
        where: { id: line.variantId },
        select: { id: true, qtyOnHand: true, wacCost: true, referenceSellPrice: true, isOffInventory: true },
      });

      if (!variant) {
        // Off-inventory: auto-create at qty 0
        variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: line.variantId },
          select: { id: true, qtyOnHand: true, wacCost: true, referenceSellPrice: true, isOffInventory: true },
        });
      }

      const unitCostAtSale = new Decimal(variant.wacCost.toString());
      const newQty = variant.qtyOnHand - line.qty;

      // Flag: negative stock
      if (newQty < 0) {
        flags.push("NEGATIVE_STOCK");
        await tx.exceptionFlag.create({
          data: {
            entityType: "SaleLine",
            entityId: sale.id,
            flagType: "NEGATIVE_STOCK",
            details: {
              variantId: variant.id,
              qtyBefore: variant.qtyOnHand,
              qtySold: line.qty,
              qtyAfter: newQty,
            },
          },
        });
      }

      // Flag: price anomaly (unitPrice > 2× reference or WAC)
      const priceRef = variant.referenceSellPrice
        ? new Decimal(variant.referenceSellPrice.toString())
        : unitCostAtSale;
      if (line.unitPrice.gt(priceRef.mul(PRICE_ANOMALY_MULTIPLIER))) {
        flags.push("PRICE_ANOMALY");
        await tx.exceptionFlag.create({
          data: {
            entityType: "SaleLine",
            entityId: sale.id,
            flagType: "PRICE_ANOMALY",
            details: {
              variantId: variant.id,
              unitPrice: line.unitPrice.toString(),
              priceRef: priceRef.toString(),
              threshold: priceRef.mul(PRICE_ANOMALY_MULTIPLIER).toString(),
            },
          },
        });
      }

      const lineTotal = line.unitPrice.mul(line.qty);

      await tx.saleLine.create({
        data: {
          saleId: sale.id,
          variantId: line.variantId,
          qty: line.qty,
          unitPrice: line.unitPrice.toDecimalPlaces(2),
          unitCostAtSale: unitCostAtSale.toDecimalPlaces(2),
          lineTotal: lineTotal.toDecimalPlaces(2),
          flags,
        },
      });

      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { qtyOnHand: newQty },
      });
    }

    // Record all payments
    for (const payment of input.payments) {
      await tx.payment.create({
        data: {
          saleId: sale.id,
          channel: payment.channel,
          amount: payment.amount.toDecimalPlaces(2),
          recordedById: input.recordedById,
        },
      });
    }

    return tx.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { lines: true, payments: true },
    });
  });
}
