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
    mode: "query" | "entry";
    message?: string;
    sessionDrafts?: Draft[];
    action?: "confirm";
  };

  const { mode, message, sessionDrafts, action } = body;
  const userId = session.user.id;

  try {
    if (mode === "query") {
      if (!message?.trim()) {
        return NextResponse.json({ error: "message is required" }, { status: 400 });
      }
      const answer = await runQueryAgent(message.trim());
      return NextResponse.json({ answer });
    }

    if (mode === "entry") {
      if (action === "confirm") {
        if (!sessionDrafts?.length) {
          return NextResponse.json({ error: "No drafts to confirm" }, { status: 400 });
        }
        // Rehydrate Date objects that were serialized in transit
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
      const result = await parseEntry(message.trim());
      return NextResponse.json(result);
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
