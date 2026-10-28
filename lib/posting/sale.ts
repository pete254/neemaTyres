import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { lockVariants } from "./lock";
import type { PostSaleInput } from "./types";

type Tx = Prisma.TransactionClient;

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
 * version in ONE transaction. If posting the new version fails for any reason,
 * the original sale is left exactly as it was.
 *
 * Tyres already on the sale keep the cost they were originally sold at, so an
 * edit made after later purchases doesn't re-cost the sale at today's WAC.
 * Tyres added by the edit are costed at current WAC. The sale keeps its
 * invoice number.
 */
export async function replaceSale(oldSaleId: string, input: PostSaleInput) {
  validateSaleInput(input);
  return prisma.$transaction(async (tx) => {
    const { invoiceNo } = await tx.sale.findUniqueOrThrow({
      where: { id: oldSaleId },
      select: { invoiceNo: true },
    });
    const old = await tx.saleLine.findMany({
      where: { saleId: oldSaleId },
      select: { variantId: true, qty: true, unitCostAtSale: true },
    });
    // Qty-weighted original cost per tyre (a tyre can appear on several lines).
    const totals = new Map<string, { qty: number; cost: Decimal }>();
    for (const l of old) {
      const t = totals.get(l.variantId) ?? { qty: 0, cost: new Decimal(0) };
      t.qty += l.qty;
      t.cost = t.cost.plus(new Decimal(l.unitCostAtSale.toString()).mul(l.qty));
      totals.set(l.variantId, t);
    }
    const originalCosts = new Map(
      [...totals].filter(([, t]) => t.qty > 0).map(([id, t]) => [id, t.cost.div(t.qty)])
    );
    // Lock old + new tyres together, in one sorted pass, before touching stock.
    await lockVariants(tx, [...old.map((l) => l.variantId), ...input.lines.map((l) => l.variantId)]);
    await deleteSaleInTx(tx, oldSaleId);
    return postSaleInTx(tx, input, { originalCosts, invoiceNo });
  });
}

async function nextInvoiceNo(tx: Tx, date: Date) {
  const year = date.getFullYear();
  const lastInvoice = await tx.sale.findFirst({
    where: { invoiceNo: { startsWith: `${year}-` } },
    orderBy: { invoiceNo: "desc" },
    select: { invoiceNo: true },
  });
  const lastNum = lastInvoice?.invoiceNo ? parseInt(lastInvoice.invoiceNo.split("-")[1], 10) : 0;
  return `${year}-${String(lastNum + 1).padStart(3, "0")}`;
}

async function postSaleInTx(
  tx: Tx,
  input: PostSaleInput,
  { originalCosts = new Map(), invoiceNo: keepInvoiceNo = null }: {
    originalCosts?: Map<string, Decimal>;
    invoiceNo?: string | null;
  } = {}
) {
  const linesTotal = validateSaleInput(input);
  await lockVariants(tx, input.lines.map((l) => l.variantId));

  const invoiceNo = keepInvoiceNo ?? (await nextInvoiceNo(tx, input.date));

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

    const unitCostAtSale =
      originalCosts.get(line.variantId) ?? new Decimal(variant.wacCost.toString());
    const newQty = variant.qtyOnHand - line.qty;

    // Selling ahead of the purchase being recorded is allowed (business rule);
    // stock goes negative and the line is flagged for follow-up.
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
