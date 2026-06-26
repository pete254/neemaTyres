import { prisma } from "@/lib/prisma";
import type { PostDebtCollectionInput } from "./types";

/**
 * Records a debt collection — reduces customer receivable.
 * This is NOT revenue and must never appear in revenue totals.
 */
export async function postDebtCollection(input: PostDebtCollectionInput) {
  return prisma.$transaction(async (tx) => {
    return tx.debtCollection.create({
      data: {
        customerId: input.customerId,
        amount: input.amount.toDecimalPlaces(2),
        channel: input.channel,
        date: input.date,
        note: input.note ?? null,
        recordedById: input.recordedById,
      },
    });
  });
}

/**
 * Derives the outstanding receivable for a customer from first principles.
 * receivable = Σ(DEBT payment portions) − Σ(debt collections)
 * This is the source of truth — never use a cached field as the sole source.
 */
export async function getCustomerReceivable(customerId: string): Promise<import("decimal.js").default> {
  const Decimal = (await import("decimal.js")).default;

  const [debtPayments, collections] = await Promise.all([
    prisma.payment.aggregate({
      where: { sale: { customerId }, channel: "DEBT" },
      _sum: { amount: true },
    }),
    prisma.debtCollection.aggregate({
      where: { customerId },
      _sum: { amount: true },
    }),
  ]);

  const totalDebt = new Decimal((debtPayments._sum.amount ?? 0).toString());
  const totalCollected = new Decimal((collections._sum.amount ?? 0).toString());
  return totalDebt.minus(totalCollected);
}
