import Decimal from "decimal.js";
import { parseEntryMessage } from "./parser";
import { resolveTransactions } from "./resolver";
import { postSale } from "@/lib/posting/sale";
import { postPurchase } from "@/lib/posting/purchase";
import type { PostSaleInput, PostPurchaseInput } from "@/lib/posting/types";
import type { Draft, DraftSale, DraftPurchase, ParseResult } from "./types";

export interface EntryParseResult {
  status: "gaps" | "confirm" | "posted";
  message?: string;
  drafts?: Draft[];
  gaps?: ParseResult["gaps"];
  results?: { draftId: string; success: boolean; error?: string }[];
}

export async function parseEntry(
  message: string,
  today: Date = new Date()
): Promise<EntryParseResult> {
  const { transactions } = await parseEntryMessage(message, today);

  if (transactions.length === 0) {
    return {
      status: "gaps",
      message:
        "I could not parse any transactions from your message. Please describe a sale or purchase.",
      drafts: [],
      gaps: [],
    };
  }

  const { drafts, gaps } = await resolveTransactions(transactions);

  if (gaps.length > 0) {
    return { status: "gaps", drafts, gaps };
  }

  return { status: "confirm", drafts };
}

export async function confirmEntry(
  drafts: Draft[],
  userId: string
): Promise<EntryParseResult> {
  const results: { draftId: string; success: boolean; error?: string }[] = [];

  for (const draft of drafts) {
    try {
      if (draft.type === "sale") {
        await postSale(toSaleInput(draft as DraftSale, userId));
      } else if (draft.type === "purchase") {
        await postPurchase(toPurchaseInput(draft as DraftPurchase, userId));
      }
      results.push({ draftId: draft.draftId, success: true });
    } catch (err) {
      results.push({
        draftId: draft.draftId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { status: "posted", results };
}

function toSaleInput(draft: DraftSale, userId: string): PostSaleInput {
  return {
    customerId: draft.customerId,
    date: draft.date,
    recordedById: userId,
    lines: draft.lines.map((l) => ({
      variantId: l.variantId!,
      qty: l.qty,
      unitPrice: new Decimal(l.unitPrice!),
    })),
    payments: draft.payments.map((p) => ({
      channel: p.channel,
      amount: new Decimal(p.amount!),
    })),
  };
}

function toPurchaseInput(draft: DraftPurchase, userId: string): PostPurchaseInput {
  return {
    supplierId: draft.supplierId,
    date: draft.date,
    terms: draft.terms!,
    recordedById: userId,
    lines: draft.lines.map((l) => ({
      variantId: l.variantId!,
      qty: l.qty,
      unitCost: new Decimal(l.unitCost!),
    })),
  };
}
