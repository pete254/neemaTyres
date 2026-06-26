import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { appendLedgerEntry } from "./ledger";
import type { PostSupplierPaymentInput } from "./types";

export async function postSupplierPayment(input: PostSupplierPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.create({
      data: {
        supplierId: input.supplierId,
        amount: input.amount.toDecimalPlaces(2),
        date: input.date,
        note: input.note ?? null,
        recordedById: input.recordedById,
      },
    });

    await appendLedgerEntry(
      tx,
      input.supplierId,
      input.date,
      input.note ?? `Payment ${payment.id}`,
      new Decimal(0),
      input.amount
    );

    return payment;
  });
}
