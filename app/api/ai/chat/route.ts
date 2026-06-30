import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runQueryAgent } from "@/lib/ai/queryAgent";
import { parseEntry, confirmEntry } from "@/lib/ai/entryAgent";
import type { Draft } from "@/lib/ai/types";

export const runtime = "nodejs";

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
      // Try to parse as a transaction first.
      // If Gemini finds no transactions → fall back to the query agent.
      const entryResult = await parseEntry(text);
      if (
        entryResult.status === "gaps" &&
        (!entryResult.drafts || entryResult.drafts.length === 0) &&
        (!entryResult.gaps || entryResult.gaps.length === 0)
      ) {
        const answer = await runQueryAgent(text);
        return NextResponse.json({ answer, _resolvedAs: "query" });
      }
      return NextResponse.json({ ...entryResult, _resolvedAs: "entry" });
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
