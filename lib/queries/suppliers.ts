import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function getSuppliers() {
  const [suppliers, balances] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.ledgerEntry.groupBy({
      by: ["supplierId"],
      _sum: { debit: true, credit: true },
    }),
  ]);

  // Current balance = Σ debit − Σ credit across the supplier's ledger entries.
  const balanceById = new Map(
    balances.map((b) => [
      b.supplierId,
      new Decimal(b._sum.debit?.toString() ?? "0").minus(
        b._sum.credit?.toString() ?? "0"
      ),
    ])
  );

  return suppliers.map((s) => ({
    ...s,
    currentBalance: balanceById.get(s.id) ?? new Decimal(0),
  }));
}

export async function getSupplierStatement(supplierId: string) {
  const [supplier, rawEntries] = await Promise.all([
    prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } }),
    prisma.ledgerEntry.findMany({
      where: { supplierId },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
  ]);

  // Always derive the running balance in chronological order rather than
  // trusting the stored value, which can be stale if an entry was posted or
  // edited out of date order. Keeps the statement internally consistent.
  let balance = new Decimal(0);
  const entries = rawEntries.map((e) => {
    balance = balance
      .plus(e.debit.toString())
      .minus(e.credit.toString());
    return { ...e, runningBalance: balance.toDecimalPlaces(2) };
  });

  return { supplier, entries };
}
