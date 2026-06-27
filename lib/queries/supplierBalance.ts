import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface SupplierStatementLine {
  id: string;
  date: Date;
  description: string;
  debit: Decimal;
  credit: Decimal;
  runningBalance: Decimal;
}

export interface SupplierBalanceResult {
  supplierId: string;
  supplierName: string;
  balance: Decimal;
  statement: SupplierStatementLine[];
}

export async function getSupplierBalance(
  supplierName: string
): Promise<SupplierBalanceResult | null> {
  const supplier = await prisma.supplier.findFirst({
    where: { name: { contains: supplierName, mode: "insensitive" } },
    include: {
      ledgerEntries: { orderBy: [{ date: "asc" }, { id: "asc" }] },
    },
  });

  if (!supplier) return null;

  let runningBalance = new Decimal(0);
  const statement: SupplierStatementLine[] = supplier.ledgerEntries.map(
    (entry) => {
      const debit = new Decimal(entry.debit.toString());
      const credit = new Decimal(entry.credit.toString());
      runningBalance = runningBalance.plus(debit).minus(credit);
      return {
        id: entry.id,
        date: entry.date,
        description: entry.description,
        debit,
        credit,
        runningBalance,
      };
    }
  );

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    balance: runningBalance,
    statement,
  };
}
