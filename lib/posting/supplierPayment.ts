import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { appendLedgerEntry, recomputeSupplierLedger } from "./ledger";
import type { PostSupplierPaymentInput, UpdateSupplierPaymentInput } from "./types";

const paymentDescription = (note?: string | null) => note?.trim() || "Payment";

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
      paymentDescription(input.note),
      new Decimal(0),
      input.amount
    );

    return payment;
  });
}

/**
 * LedgerEntry has no FK back to the payment, so the credit a payment posted is
 * located by the payment's values (supplier, date, amount, description),
 * falling back to supplier/date/amount if the description was changed
 * elsewhere. Throws rather than guess when nothing matches.
 */
async function findPaymentLedgerEntry(
  tx: Prisma.TransactionClient,
  payment: { supplierId: string; date: Date; amount: Prisma.Decimal; note: string | null }
) {
  const match = {
    supplierId: payment.supplierId,
    date: payment.date,
    credit: payment.amount,
    debit: 0,
  };
  const entry =
    (await tx.ledgerEntry.findFirst({
      where: { ...match, description: paymentDescription(payment.note) },
      orderBy: { id: "asc" },
    })) ??
    (await tx.ledgerEntry.findFirst({ where: match, orderBy: { id: "asc" } }));
  if (!entry) {
    throw new Error(
      "Could not find the ledger entry for this payment — ledger left unchanged."
    );
  }
  return entry;
}

/** Edits a recorded supplier payment and the ledger credit it posted. */
export async function updateSupplierPayment(input: UpdateSupplierPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const old = await tx.supplierPayment.findUniqueOrThrow({
      where: { id: input.id },
    });

    const entry = await findPaymentLedgerEntry(tx, old);

    const amount = input.amount.toDecimalPlaces(2);
    const note = input.note?.trim() || null;

    const payment = await tx.supplierPayment.update({
      where: { id: old.id },
      data: { supplierId: input.supplierId, amount, date: input.date, note },
    });

    await tx.ledgerEntry.update({
      where: { id: entry.id },
      data: {
        supplierId: input.supplierId,
        date: input.date,
        description: paymentDescription(note),
        credit: amount,
      },
    });

    await recomputeSupplierLedger(tx, input.supplierId);
    if (old.supplierId !== input.supplierId) {
      await recomputeSupplierLedger(tx, old.supplierId);
    }

    return { before: old, after: payment };
  });
}

/** Deletes a supplier payment and removes the ledger credit it posted. */
export async function deleteSupplierPayment(paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    const entry = await findPaymentLedgerEntry(tx, payment);

    await tx.ledgerEntry.delete({ where: { id: entry.id } });
    await tx.supplierPayment.delete({ where: { id: payment.id } });
    await recomputeSupplierLedger(tx, payment.supplierId);

    return payment;
  });
}
