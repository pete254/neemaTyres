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

const isReversal = (e: StatementEntry) => /^reversal/i.test(e.description);
const isPurchaseReturn = (e: StatementEntry) => /^purchase return/i.test(e.description);
const isOpening = (e: StatementEntry) => /^opening balance/i.test(e.description);
const isPurchase = (e: StatementEntry) =>
  /^purchase/i.test(e.description) && !isPurchaseReturn(e);

export type StatementEntryType = "purchase" | "payment" | "return" | "reversal" | "opening" | "other";

export function statementEntryType(e: StatementEntry): StatementEntryType {
  if (isReversal(e)) return "reversal";
  if (isOpening(e)) return "opening";
  if (isPurchaseReturn(e)) return "return";
  if (isPurchase(e) && Number(e.debit) > 0) return "purchase";
  if (Number(e.credit) > 0) return "payment";
  return "other";
}

/**
 * Removes reversal entries (posted when a purchase is edited/deleted) together
 * with the original purchase debit each one cancels, so the statement reads
 * cleanly. Handles both description formats the app has used:
 *   - "Reversal of purchase <id>"  ↔ "Purchase receipt <id>"   (before 2026-07-06)
 *   - "Reversal — <goods>"         ↔ "Purchase — <goods>"      (current)
 * Matching falls back to same date + amount, then to the latest earlier
 * purchase of the same amount. Each pair nets to zero, so the running balance
 * is re-derived over what remains and the closing balance is unchanged. A
 * reversal with no matching purchase at all is kept visible so the balance
 * isn't skewed.
 */
export function hideReversalPairs(entries: StatementEntry[]) {
  const hidden = new Set<string>();

  for (const rev of entries) {
    if (!isReversal(rev)) continue;
    const amount = new Decimal(rev.credit.toString());
    const pool = entries.filter(
      (e) =>
        !hidden.has(e.id) &&
        isPurchase(e) &&
        !isReversal(e) &&
        e.date.getTime() <= rev.date.getTime() &&
        new Decimal(e.debit.toString()).eq(amount)
    );
    if (pool.length === 0) continue;

    const oldId = rev.description.match(/^Reversal of purchase (\S+)/)?.[1];
    const newGoods = rev.description.startsWith("Reversal — ")
      ? "Purchase — " + rev.description.slice("Reversal — ".length)
      : null;
    const sameDay = pool.filter((e) => e.date.getTime() === rev.date.getTime());

    const original =
      (oldId && pool.find((e) => e.description === `Purchase receipt ${oldId}`)) ||
      (newGoods && sameDay.find((e) => e.description === newGoods)) ||
      sameDay[0] ||
      pool[pool.length - 1];

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

export interface StatementFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  type?: "all" | "purchase" | "payment" | "return";
  q?: string;
  hideReversals?: boolean;
}

/** Reads statement filters from URL search params (shared by page and PDF). */
export function parseStatementFilters(
  p: Record<string, string | undefined>
): StatementFilters {
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const type = ["purchase", "payment", "return"].includes(p.type ?? "")
    ? (p.type as StatementFilters["type"])
    : "all";
  return {
    from: date(p.from),
    to: date(p.to),
    type,
    q: p.q?.trim() || undefined,
    hideReversals: p.hideReversals === "1",
  };
}

export function statementFiltersToQuery(f: StatementFilters): string {
  const qs = new URLSearchParams();
  if (f.from) qs.set("from", f.from);
  if (f.to) qs.set("to", f.to);
  if (f.type && f.type !== "all") qs.set("type", f.type);
  if (f.q) qs.set("q", f.q);
  if (f.hideReversals) qs.set("hideReversals", "1");
  return qs.toString();
}

/**
 * Supplier statement with filters applied. Running balances always reflect the
 * whole ledger (after optional reversal hiding), so a filtered row still shows
 * the true balance at that point. A date range adds a balance brought forward
 * and ends at the balance as of the "to" date.
 */
export async function getFilteredSupplierStatement(
  supplierId: string,
  filters: StatementFilters
) {
  const { supplier, entries: all } = await getSupplierStatement(supplierId);
  const reversalCount = all.filter(isReversal).length;

  const { entries: base, hiddenPairs } = filters.hideReversals
    ? hideReversalPairs(all)
    : { entries: all, hiddenPairs: 0 };

  const fromTs = filters.from ? new Date(filters.from + "T00:00:00Z").getTime() : -Infinity;
  const toTs = filters.to ? new Date(filters.to + "T23:59:59.999Z").getTime() : Infinity;

  const before = base.filter((e) => e.date.getTime() < fromTs);
  const upToEnd = base.filter((e) => e.date.getTime() <= toTs);
  const lastBal = (xs: StatementEntry[]) =>
    xs.length ? new Decimal(xs[xs.length - 1].runningBalance.toString()) : new Decimal(0);

  const q = filters.q?.toLowerCase();
  const entries = base.filter((e) => {
    const t = e.date.getTime();
    if (t < fromTs || t > toTs) return false;
    if (filters.type && filters.type !== "all" && statementEntryType(e) !== filters.type) return false;
    if (q && !e.description.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalDebit = entries.reduce((s, e) => s.plus(e.debit.toString()), new Decimal(0));
  const totalCredit = entries.reduce((s, e) => s.plus(e.credit.toString()), new Decimal(0));

  return {
    supplier,
    entries,
    openingBalance: filters.from ? lastBal(before) : null,
    closingBalance: lastBal(upToEnd),
    currentBalance: lastBal(base),
    totalDebit,
    totalCredit,
    hiddenPairs,
    reversalCount,
    isFiltered:
      !!filters.from || !!filters.to || !!filters.q || (!!filters.type && filters.type !== "all"),
  };
}
