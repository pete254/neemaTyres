import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import type {
  RawTransaction,
  RawLine,
  Draft,
  DraftSale,
  DraftPurchase,
  DraftSaleLine,
  DraftPurchaseLine,
  DraftPayment,
  Gap,
  ParseResult,
} from "./types";

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function resolveSize(alias: string): Promise<string> {
  const entry = await prisma.sizeAlias.findFirst({
    where: { alias: { equals: alias, mode: "insensitive" } },
  });
  return entry?.sizeCanonical ?? alias;
}

async function resolveVariant(
  sizeCanonical: string,
  brandName: string,
  position?: string
): Promise<{
  id: string;
  label: string;
  referenceSellPrice?: Decimal;
  multipleFound: boolean;
} | null> {
  const variants = await prisma.productVariant.findMany({
    where: {
      sizeCanonical: { equals: sizeCanonical, mode: "insensitive" },
      brand: { name: { contains: brandName, mode: "insensitive" } },
      ...(position ? { position: position as never } : {}),
    },
    include: { brand: true },
    take: 5,
  });

  if (variants.length === 0) return null;
  if (variants.length > 1 && !position) {
    return { id: "", label: "", multipleFound: true };
  }

  const v = variants[0];
  return {
    id: v.id,
    label:
      `${v.sizeCanonical} ${v.brand.name}${v.subLabel ? ` ${v.subLabel}` : ""} ${v.position}`.trim(),
    referenceSellPrice: v.referenceSellPrice
      ? new Decimal(v.referenceSellPrice.toString())
      : undefined,
    multipleFound: false,
  };
}

async function resolveCustomer(
  name: string
): Promise<{ id: string; name: string; ambiguous: boolean } | null> {
  const customers = await prisma.customer.findMany({
    where: { name: { contains: name, mode: "insensitive" } },
    take: 3,
  });
  if (customers.length === 0) return null;
  return {
    id: customers[0].id,
    name: customers[0].name,
    ambiguous: customers.length > 1,
  };
}

async function resolveSupplier(
  name: string
): Promise<{ id: string; name: string } | null> {
  const supplier = await prisma.supplier.findFirst({
    where: { name: { contains: name, mode: "insensitive" } },
  });
  return supplier ? { id: supplier.id, name: supplier.name } : null;
}

async function resolveSaleLine(
  line: RawLine,
  draftId: string,
  gaps: Gap[]
): Promise<DraftSaleLine> {
  let variantId: string | undefined;
  let variantLabel: string | undefined;
  let referenceSellPrice: Decimal | undefined;
  let positionAmbiguous = false;

  if (line.sizeAlias && line.brandName) {
    const sizeCanonical = await resolveSize(line.sizeAlias);
    const found = await resolveVariant(sizeCanonical, line.brandName, line.position);

    if (found && !found.multipleFound) {
      variantId = found.id;
      variantLabel = found.label;
      referenceSellPrice = found.referenceSellPrice;
    } else if (found?.multipleFound) {
      positionAmbiguous = true;
      gaps.push({
        draftId,
        field: "position",
        question: `What position is the ${line.brandName} ${line.sizeAlias}? (AP, DIFF, STEERING, or NONE)`,
      });
    } else {
      gaps.push({
        draftId,
        field: "variantId",
        question: `Could not find ${line.brandName} ${line.sizeAlias}${line.position ? ` ${line.position}` : ""} in inventory. Please check the size and brand.`,
      });
    }
  } else {
    if (!line.sizeAlias) {
      gaps.push({ draftId, field: "size", question: `What tyre size for: "${line.raw}"?` });
    }
    if (!line.brandName) {
      gaps.push({ draftId, field: "brand", question: `What brand for: "${line.raw}"?` });
    }
  }

  let unitPrice = line.unitPrice;
  if (line.useStockPrice) {
    if (referenceSellPrice) {
      unitPrice = referenceSellPrice.toNumber();
    } else {
      gaps.push({
        draftId,
        field: "unitPrice",
        question: `No stock price set for ${variantLabel ?? line.raw}. What is the selling price?`,
      });
    }
  } else if (!unitPrice) {
    gaps.push({
      draftId,
      field: "unitPrice",
      question: `What is the selling price for ${variantLabel ?? line.raw}?`,
    });
  }

  return {
    raw: line.raw,
    variantId,
    variantLabel,
    qty: line.qty,
    unitPrice,
    useStockPrice: line.useStockPrice,
    positionAmbiguous,
  };
}

async function resolvePurchaseLine(
  line: RawLine,
  draftId: string,
  gaps: Gap[]
): Promise<DraftPurchaseLine> {
  let variantId: string | undefined;
  let variantLabel: string | undefined;

  if (line.sizeAlias && line.brandName) {
    const sizeCanonical = await resolveSize(line.sizeAlias);
    const found = await resolveVariant(sizeCanonical, line.brandName, line.position);

    if (found && !found.multipleFound) {
      variantId = found.id;
      variantLabel = found.label;
    } else if (found?.multipleFound) {
      gaps.push({
        draftId,
        field: "position",
        question: `What position is the ${line.brandName} ${line.sizeAlias}? (AP, DIFF, STEERING, or NONE)`,
      });
    } else {
      gaps.push({
        draftId,
        field: "variantId",
        question: `Could not find ${line.brandName} ${line.sizeAlias}${line.position ? ` ${line.position}` : ""} in inventory.`,
      });
    }
  } else {
    if (!line.sizeAlias) {
      gaps.push({ draftId, field: "size", question: `What tyre size for: "${line.raw}"?` });
    }
    if (!line.brandName) {
      gaps.push({ draftId, field: "brand", question: `What brand for: "${line.raw}"?` });
    }
  }

  if (!line.unitCost) {
    gaps.push({
      draftId,
      field: "unitCost",
      question: `What is the cost price for ${variantLabel ?? line.raw}?`,
    });
  }

  return { raw: line.raw, variantId, variantLabel, qty: line.qty, unitCost: line.unitCost };
}

function computeBalancePayments(
  rawPayments: Array<{ channel: "CASH" | "MPESA" | "DEBT"; amount?: number; isBalance?: boolean }>,
  lineTotal: number
): DraftPayment[] {
  const knownSum = rawPayments
    .filter((p) => !p.isBalance && p.amount !== undefined)
    .reduce((s, p) => s + (p.amount ?? 0), 0);

  return rawPayments.map((p): DraftPayment => {
    if (p.isBalance) {
      return { channel: p.channel, amount: Math.max(0, lineTotal - knownSum), isBalance: true };
    }
    return { channel: p.channel, amount: p.amount };
  });
}

export async function resolveTransactions(
  transactions: RawTransaction[]
): Promise<ParseResult> {
  const drafts: Draft[] = [];
  const gaps: Gap[] = [];

  for (const tx of transactions) {
    const draftId = genId();
    const date = new Date(tx.date);
    const warnings: string[] = [];

    if (tx.type === "sale") {
      const resolvedLines: DraftSaleLine[] = [];
      for (const line of tx.lines) {
        resolvedLines.push(await resolveSaleLine(line, draftId, gaps));
      }

      const lineTotal = resolvedLines.reduce(
        (s, l) => s + (l.unitPrice ?? 0) * l.qty,
        0
      );
      const rawPayments = tx.payments ?? [];
      const payments = computeBalancePayments(rawPayments, lineTotal);

      let customerId: string | undefined;
      let customerAmbiguous = false;
      if (tx.customerName) {
        const cust = await resolveCustomer(tx.customerName);
        if (cust) {
          customerId = cust.id;
          customerAmbiguous = cust.ambiguous;
          if (cust.ambiguous) {
            warnings.push(`Multiple customers match "${tx.customerName}" — using first match`);
          }
        }
      }

      const draft: DraftSale = {
        type: "sale",
        draftId,
        date,
        customerName: tx.customerName,
        customerId,
        customerAmbiguous,
        lines: resolvedLines,
        payments,
        lineTotal,
        warnings,
      };
      drafts.push(draft);
    } else {
      const resolvedLines: DraftPurchaseLine[] = [];
      for (const line of tx.lines) {
        resolvedLines.push(await resolvePurchaseLine(line, draftId, gaps));
      }

      if (!tx.supplierName) {
        gaps.push({
          draftId,
          field: "supplierName",
          question: "Who is the supplier for this purchase?",
        });
      }
      if (!tx.terms) {
        gaps.push({
          draftId,
          field: "terms",
          question: "What are the purchase terms? (CASH, CREDIT, or FREE)",
        });
      }

      let supplierId: string | undefined;
      if (tx.supplierName) {
        const sup = await resolveSupplier(tx.supplierName);
        if (sup) supplierId = sup.id;
      }

      const draft: DraftPurchase = {
        type: "purchase",
        draftId,
        date,
        supplierName: tx.supplierName,
        supplierId,
        terms: tx.terms,
        lines: resolvedLines,
        warnings,
      };
      drafts.push(draft);
    }
  }

  return { drafts, gaps };
}
