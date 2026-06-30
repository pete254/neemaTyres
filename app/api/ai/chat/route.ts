import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runQueryAgent } from "@/lib/ai/queryAgent";
import { parseEntry, confirmEntry } from "@/lib/ai/entryAgent";
import type { Draft } from "@/lib/ai/types";

export const runtime = "nodejs";

// Zero-cost heuristic: returns true if the message looks like a transaction
// description rather than a question. A transaction typically has a price
// (4+ digit number) PLUS at least one of: tyre size, payment word, or
// stock-movement word. This avoids a wasted Gemini call for every query.
function looksLikeTransaction(text: string): boolean {
  const lower = text.toLowerCase();
  const hasPrice = /\b\d[\d,]{3,}\b/.test(text); // 4+ digit number e.g. 18500 or 18,500
  const hasTyreSize = /\b(22\.5|20|19\.5|17\.5|16|15|14|13|315|295|275|265|235|225|11r|825r|900r|1000r)\b/i.test(text);
  const hasPaymentWord = /\b(cash|mpesa|mum|debt|deni|credit|balance|rest)\b/.test(lower);
  const hasStockWord = /\b(sold|sale|bought|purchase|received|receive|stock)\b/.test(lower);
  return hasPrice && (hasTyreSize || hasPaymentWord || hasStockWord);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    mode: "query" | "entry" | "smart";
    message?: string;
    sessionDrafts?: Draft[];
    action?: "confirm";
  };

  const { mode, message, sessionDrafts, action } = body;
  const userId = session.user.id;

  try {
    // Confirm flow (shared by entry and smart modes)
    if (action === "confirm") {
      if (!sessionDrafts?.length) {
        return NextResponse.json({ error: "No drafts to confirm" }, { status: 400 });
      }
      const drafts = sessionDrafts.map((d) => ({
        ...d,
        date: new Date(d.date),
      })) as Draft[];
      const result = await confirmEntry(drafts, userId);
      return NextResponse.json(result);
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const text = message.trim();

    if (mode === "query") {
      const answer = await runQueryAgent(text);
      return NextResponse.json({ answer });
    }

    if (mode === "entry") {
      const result = await parseEntry(text);
      return NextResponse.json(result);
    }

    if (mode === "smart") {
      // Classify intent with a zero-cost keyword heuristic before calling Gemini.
      // A transaction description typically contains a price (4+ digit number) AND
      // at least one of: a tyre size, a payment keyword, or a purchase keyword.
      if (looksLikeTransaction(text)) {
        const entryResult = await parseEntry(text);
        return NextResponse.json({ ...entryResult, _resolvedAs: "entry" });
      }
      const answer = await runQueryAgent(text);
      return NextResponse.json({ answer, _resolvedAs: "query" });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("[AI chat error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
