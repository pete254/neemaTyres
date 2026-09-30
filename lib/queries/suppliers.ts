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

export async function getSupplierPayments(supplierId?: string) {
  return prisma.supplierPayment.findMany({
    where: supplierId ? { supplierId } : undefined,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: supplierId ? undefined : 200,
    include: {
      supplier: { select: { id: true, name: true } },
      recordedBy: { select: { name: true } },
    },
  });
}

export async function getSupplierPaymentById(id: string) {
  return prisma.supplierPayment.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      recordedBy: { select: { name: true } },
    },
  });
}

type StatementEntry = Awaited<ReturnType<typeof getSupplierStatement>>["entries"][number];

/**
 * Removes "Reversal — …" entries (posted when a purchase is edited/deleted)
 * together with the original "Purchase — …" debit each one cancels, so the
 * statement reads cleanly. Each pair nets to zero, so the running balance is
 * re-derived over what remains and the closing balance is unchanged. A
 * reversal whose original can't be found is kept visible to avoid skewing
 * the balance.
 */
export function hideReversalPairs(entries: StatementEntry[]) {
  const hidden = new Set<string>();

  for (const rev of entries) {
    if (!rev.description.startsWith("Reversal — ")) continue;
    const credit = rev.credit.toString();
    const originalDesc = "Purchase — " + rev.description.slice("Reversal — ".length);
    const candidates = entries.filter(
      (e) =>
        !hidden.has(e.id) &&
        e.id !== rev.id &&
        e.date.getTime() === rev.date.getTime() &&
        new Decimal(e.debit.toString()).eq(credit) &&
        e.description.startsWith("Purchase — ")
    );
    const original =
      candidates.find((e) => e.description === originalDesc) ?? candidates[0];
    if (!original) continue;
    hidden.add(rev.id);
    hidden.add(original.id);
  }

  let balance = new Decimal(0);
  const visible = entries
    .filter((e) => !hidden.has(e.id))
    .map((e) => {
      balance = balance.plus(e.debit.toString()).minus(e.credit.toString());
      return { ...e, runningBalance: balance.toDecimalPlaces(2) };
    });

  return { entries: visible, hiddenPairs: hidden.size / 2 };
}
