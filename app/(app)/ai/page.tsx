"use client";

import { useState, useRef, useEffect } from "react";
import type { Draft, Gap } from "@/lib/ai/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  drafts?: Draft[];
  gaps?: Gap[];
  status?: "gaps" | "confirm" | "posted" | "query";
}

const fmt = (n: number) => new Intl.NumberFormat("en-KE").format(n);

function GapList({ gaps }: { gaps: Gap[] }) {
  return (
    <div className="mt-3 space-y-1">
      {gaps.map((g, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="text-orange-400 mt-0.5">•</span>
          <span className="text-orange-300">{g.question}</span>
        </div>
      ))}
    </div>
  );
}

function DraftCard({ draft }: { draft: Draft }) {
  const dateStr = new Date(draft.date).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (draft.type === "sale") {
    const lineTotal = draft.lineTotal ?? 0;
    return (
      <div className="border border-[#2A2A2A] rounded-lg p-3 bg-[#0A0A0A] text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-[#EAB308]">SALE — {dateStr}</span>
          {draft.customerName && (
            <span className="text-zinc-400">{draft.customerName}</span>
          )}
        </div>
        {draft.warnings.map((w, i) => (
          <div key={i} className="text-orange-400 text-xs mb-1">⚠ {w}</div>
        ))}
        <div className="space-y-1 mb-2">
          {draft.lines.map((l, i) => (
            <div key={i} className="flex justify-between text-zinc-300">
              <span>
                {l.qty} × {l.variantLabel ?? l.raw}
                {l.positionAmbiguous && (
                  <span className="ml-1 text-orange-400 text-xs">[position?]</span>
                )}
              </span>
              <span>{l.unitPrice ? `KES ${fmt(l.unitPrice * l.qty)}` : "—"}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#2A2A2A] pt-2 mt-2">
          <div className="flex justify-between font-semibold text-white mb-1">
            <span>Total</span>
            <span>KES {fmt(lineTotal)}</span>
          </div>
          {draft.payments.map((p, i) => (
            <div key={i} className="flex justify-between text-xs text-zinc-400">
              <span>{p.channel}{p.isBalance ? " (balance)" : ""}</span>
              <span>{p.amount !== undefined ? `KES ${fmt(p.amount)}` : "—"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#2A2A2A] rounded-lg p-3 bg-[#0A0A0A] text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-blue-400">PURCHASE — {dateStr}</span>
        <span className="text-zinc-400">
          {draft.supplierName ?? "Unknown supplier"}
          {draft.terms ? ` · ${draft.terms}` : ""}
        </span>
      </div>
      {draft.warnings.map((w, i) => (
        <div key={i} className="text-orange-400 text-xs mb-1">⚠ {w}</div>
      ))}
      <div className="space-y-1">
        {draft.lines.map((l, i) => (
          <div key={i} className="flex justify-between text-zinc-300">
            <span>{l.qty} × {l.variantLabel ?? l.raw}</span>
            <span>{l.unitCost ? `KES ${fmt(l.unitCost * l.qty)}` : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState<Draft[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "smart", message: text }),
      });
      const data = await res.json();

      if (data._resolvedAs === "query" || data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer ?? data.error ?? "No response.",
            status: "query",
          },
        ]);
        return;
      }

      // Entry flow
      const { status, drafts, gaps, message: msg } = data;
      if (status === "gaps") {
        setPendingDrafts(drafts ?? []);
        const gapText =
          gaps?.length > 0
            ? `I need a few more details:`
            : msg ?? "Could not parse. Please rephrase.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: gapText, drafts, gaps, status },
        ]);
      } else if (status === "confirm") {
        setPendingDrafts(drafts ?? []);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Ready to post ${drafts?.length ?? 0} transaction(s). Review below and confirm.`,
            drafts,
            status,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error communicating with the server. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!pendingDrafts?.length || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "smart",
          action: "confirm",
          sessionDrafts: pendingDrafts,
        }),
      });
      const data = await res.json();
      const { results } = data;
      const successCount = results?.filter((r: { success: boolean }) => r.success).length ?? 0;
      const failCount = (results?.length ?? 0) - successCount;

      let msg = `Posted ${successCount} transaction(s) successfully.`;
      if (failCount > 0) msg += ` ${failCount} failed — check the details and try again.`;

      setMessages((prev) => [...prev, { role: "assistant", content: msg, status: "posted" }]);
      setPendingDrafts(null);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error posting transactions. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const showConfirm =
    pendingDrafts &&
    pendingDrafts.length > 0 &&
    messages.at(-1)?.status === "confirm";

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Ask anything or describe a sale / purchase to record it
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-zinc-500 text-sm mt-8 text-center space-y-1">
            <p className="font-medium text-zinc-400">What can I help you with?</p>
            <p>&ldquo;Who is my highest debtor?&rdquo;</p>
            <p>&ldquo;What did I sell today?&rdquo;</p>
            <p>&ldquo;What stock do I have in 22.5?&rdquo;</p>
            <p>&ldquo;Kamau 2 Roadshine AP 22.5 at 28,000, cash&rdquo;</p>
            <p>&ldquo;Received 10 Linglong 315 from Neema at 18,500 each&rdquo;</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#EAB308] text-black"
                  : "bg-[#1C1C1C] text-zinc-200"
              }`}
            >
              {msg.content}

              {msg.gaps && msg.gaps.length > 0 && <GapList gaps={msg.gaps} />}

              {msg.drafts && msg.drafts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.drafts.map((d) => (
                    <DraftCard key={d.draftId} draft={d} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1C1C1C] rounded-xl px-4 py-2.5 text-sm text-zinc-500 animate-pulse">
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {showConfirm && (
        <div className="mb-3">
          <button
            onClick={confirm}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Confirm &amp; Post {pendingDrafts!.length} transaction
            {pendingDrafts!.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ask a question or describe a sale / purchase…'
          rows={2}
          className="flex-1 resize-none rounded-lg bg-[#111] border border-[#2A2A2A] text-white px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#EAB308] transition-colors"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 rounded-lg bg-[#EAB308] text-black font-semibold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
