import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Row-locks the given variants (SELECT … FOR UPDATE) for the rest of the
 * transaction. Posting reads qtyOnHand/wacCost, computes the new values and
 * writes them back; without the lock two concurrent postings touching the same
 * tyre can both read the old row and one write silently overwrites the other,
 * leaving qtyOnHand out of step with the movement records. With it, the second
 * transaction waits until the first commits and then reads the fresh row.
 *
 * Ids are de-duplicated and locked in sorted order so two transactions that
 * share several variants always lock them in the same order (no deadlocks).
 */
export async function lockVariants(tx: Prisma.TransactionClient, variantIds: string[]) {
  const ids = [...new Set(variantIds)].sort();
  for (const id of ids) {
    await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${id} FOR UPDATE`;
  }
}
