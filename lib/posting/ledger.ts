import Decimal from "decimal.js";
import type { Prisma } from "@/app/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Returns the current running balance for a supplier (0 if no entries yet). */
export async function getSupplierRunningBalance(
  tx: Tx,
  supplierId: string
): Promise<Decimal> {
  const latest = await tx.ledgerEntry.findFirst({
    where: { supplierId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    select: { runningBalance: true },
  });
  return latest ? new Decimal(latest.runningBalance.toString()) : new Decimal(0);
}

/** Appends a ledger entry and returns it. */
export async function appendLedgerEntry(
  tx: Tx,
  supplierId: string,
  date: Date,
  description: string,
  debit: Decimal,
  credit: Decimal
) {
  const prev = await getSupplierRunningBalance(tx, supplierId);
  const runningBalance = prev.plus(debit).minus(credit);
  return tx.ledgerEntry.create({
    data: {
      supplierId,
      date,
      description,
      debit: debit.toDecimalPlaces(2),
      credit: credit.toDecimalPlaces(2),
      runningBalance: runningBalance.toDecimalPlaces(2),
    },
  });
}
