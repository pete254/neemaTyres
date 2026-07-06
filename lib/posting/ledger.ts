import Decimal from "decimal.js";
import type { Prisma } from "@/app/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Current payable for a supplier = Σ debit − Σ credit across all entries.
 * Order-independent, so it is always correct regardless of the order in which
 * entries were posted (unlike reading the latest row's stored runningBalance).
 */
export async function getSupplierRunningBalance(
  tx: Tx,
  supplierId: string
): Promise<Decimal> {
  const agg = await tx.ledgerEntry.aggregate({
    where: { supplierId },
    _sum: { debit: true, credit: true },
  });
  const debit = new Decimal(agg._sum.debit?.toString() ?? "0");
  const credit = new Decimal(agg._sum.credit?.toString() ?? "0");
  return debit.minus(credit);
}

/**
 * Recomputes every entry's runningBalance for a supplier in chronological
 * order ([date asc, id asc]). Call after any insert so the stored running
 * balances stay internally consistent even when an entry is backdated or
 * inserted out of order (e.g. an edited purchase re-posted after a later
 * payment already exists).
 */
export async function recomputeSupplierLedger(
  tx: Tx,
  supplierId: string
): Promise<void> {
  const entries = await tx.ledgerEntry.findMany({
    where: { supplierId },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    select: { id: true, debit: true, credit: true },
  });

  let balance = new Decimal(0);
  for (const e of entries) {
    balance = balance.plus(e.debit.toString()).minus(e.credit.toString());
    await tx.ledgerEntry.update({
      where: { id: e.id },
      data: { runningBalance: balance.toDecimalPlaces(2) },
    });
  }
}

/** Appends a ledger entry, then recomputes the chain so all balances stay correct. */
export async function appendLedgerEntry(
  tx: Tx,
  supplierId: string,
  date: Date,
  description: string,
  debit: Decimal,
  credit: Decimal
) {
  const entry = await tx.ledgerEntry.create({
    data: {
      supplierId,
      date,
      description,
      debit: debit.toDecimalPlaces(2),
      credit: credit.toDecimalPlaces(2),
      // Placeholder — corrected by the full recompute below.
      runningBalance: new Decimal(0).toDecimalPlaces(2),
    },
  });

  await recomputeSupplierLedger(tx, supplierId);
  return entry;
}
