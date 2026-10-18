import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { lockVariants } from "./lock";
import { variantLabel } from "./label";
import type { PostSaleInput } from "./types";

type Tx = Prisma.TransactionClient;

/** Thrown when a sale would take a tyre's stock below zero. */
export class InsufficientStockError extends Error {
  constructor(
    public readonly variantLabel: string,
    public readonly inStock: number,
    public readonly requested: number
  ) {
    super(
      `Not enough stock for ${variantLabel}: ${inStock} in stock, trying to sell ${requested}. ` +
        `Record the purchase first.`
    );
    this.name = "InsufficientStockError";
  }
}

async function deleteSaleInTx(tx: Tx, saleId: string) {
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
}

export async function deleteSale(saleId: string) {
  return prisma.$transaction((tx) => deleteSaleInTx(tx, saleId));
}

const PRICE_ANOMALY_MULTIPLIER = 2;

/** Payments must sum exactly to the line total — checked before any transaction. */
function validateSaleInput(input: PostSaleInput) {
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
  return linesTotal;
}

export async function postSale(input: PostSaleInput) {
  validateSaleInput(input);
  return prisma.$transaction((tx) => postSaleInTx(tx, input));
}

/**
 * Edits a sale: removes the old one (restoring its stock) and posts the new
 * version in ONE transaction. If the new version is rejected — e.g. not enough
 * stock — the original sale is left exactly as it was.
 */
export async function replaceSale(oldSaleId: string, input: PostSaleInput) {
  validateSaleInput(input);
  return prisma.$transaction(async (tx) => {
    const old = await tx.saleLine.findMany({
      where: { saleId: oldSaleId },
      select: { variantId: true },
    });
    // Lock old + new tyres together, in one sorted pass, before touching stock.
    await lockVariants(tx, [...old.map((l) => l.variantId), ...input.lines.map((l) => l.variantId)]);
    await deleteSaleInTx(tx, oldSaleId);
    return postSaleInTx(tx, input);
  });
}

async function postSaleInTx(tx: Tx, input: PostSaleInput) {
  const linesTotal = validateSaleInput(input);
  await lockVariants(tx, input.lines.map((l) => l.variantId));

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
      select: {
        id: true, qtyOnHand: true, wacCost: true, referenceSellPrice: true, isOffInventory: true,
        sizeCanonical: true, subLabel: true, position: true, brand: { select: { name: true } },
      },
    });

    if (!variant) {
      // Off-inventory: auto-create at qty 0
      variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: line.variantId },
        select: {
          id: true, qtyOnHand: true, wacCost: true, referenceSellPrice: true, isOffInventory: true,
          sizeCanonical: true, subLabel: true, position: true, brand: { select: { name: true } },
        },
      });
    }

    const unitCostAtSale = new Decimal(variant.wacCost.toString());
    const newQty = variant.qtyOnHand - line.qty;

    // Stock may not go below zero. The row is locked, so this read is current.
    // Off-inventory items (sourced to order) are exempt and only flagged.
    if (newQty < 0 && !variant.isOffInventory) {
      throw new InsufficientStockError(variantLabel(variant), variant.qtyOnHand, line.qty);
    }

    // Flag: negative stock (off-inventory only)
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
}
