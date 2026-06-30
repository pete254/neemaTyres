"use client";

import { useState, useRef, useEffect } from "react";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

export type CustomerSelection =
  | { type: "existing"; id: string; name: string }
  | { type: "new"; name: string; phone: string }
  | null;

interface Props {
  customers: Customer[];
  value: CustomerSelection;
  onChange: (v: CustomerSelection) => void;
}

const inputClass =
  "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308] w-full";

export default function CustomerPicker({ customers, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  // When "new" is confirmed but phone not yet set we sit in a "confirmNew" phase
  const [confirmNew, setConfirmNew] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const trimmedQuery = query.trim().toLowerCase();

  const matches = trimmedQuery
    ? customers.filter((c) => c.name.toLowerCase().includes(trimmedQuery))
    : [];

  // Exact name collision: typed text matches an existing customer exactly
  const exactMatch =
    trimmedQuery
      ? customers.find((c) => c.name.toLowerCase() === trimmedQuery)
      : null;

  function selectExisting(c: Customer) {
    onChange({ type: "existing", id: c.id, name: c.name });
    setQuery(c.name);
    setOpen(false);
    setConfirmNew(null);
  }

  function startNew(name: string) {
    setConfirmNew(name);
    setNewPhone("");
    setOpen(false);
  }

  function confirmNewCustomer() {
    if (!confirmNew) return;
    onChange({ type: "new", name: confirmNew, phone: newPhone });
    setQuery(confirmNew);
    setConfirmNew(null);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setConfirmNew(null);
    setNewPhone("");
    setOpen(false);
  }

  // ── Resolved state: show chip ─────────────────────────────────────────────
  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
            value.type === "existing"
              ? "bg-[#EAB308]/10 border-[#EAB308]/40 text-[#EAB308]"
              : "bg-blue-500/10 border-blue-500/40 text-blue-400"
          }`}
        >
          {value.type === "existing" ? "✓" : "+"}{" "}
          {value.name}
          {value.type === "new" && value.phone && (
            <span className="text-xs opacity-70"> · {value.phone}</span>
          )}
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-zinc-500 hover:text-white text-xs transition-colors"
        >
          Change
        </button>
      </div>
    );
  }

  // ── Confirm new customer: name locked, collect phone ──────────────────────
  if (confirmNew) {
    return (
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 space-y-3">
        <p className="text-sm text-blue-300">
          Creating new customer: <span className="font-semibold">{confirmNew}</span>
        </p>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Phone (optional)</label>
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="e.g. 0712 345 678"
            className={inputClass}
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmNewCustomer}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmNew(null);
              setOpen(true);
            }}
            className="px-4 py-1.5 rounded border border-[#2A2A2A] text-zinc-400 text-sm hover:text-white transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Search input + dropdown ───────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search customer or leave blank for anonymous walk-in"
        className={inputClass}
        autoComplete="off"
      />

      {open && trimmedQuery && (
        <div className="absolute z-50 mt-1 w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg shadow-xl overflow-hidden">
          {/* Existing matches */}
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectExisting(c)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-[#2A2A2A] transition-colors"
            >
              <span className="text-white">{c.name}</span>
              {c.phone && (
                <span className="text-zinc-500 text-xs">{c.phone}</span>
              )}
            </button>
          ))}

          {/* Create new — only show if typed name is NOT an exact match */}
          {!exactMatch && (
            <button
              type="button"
              onClick={() => startNew(query.trim())}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-[#2A2A2A] border-t border-[#2A2A2A] transition-colors text-blue-400"
            >
              <span>+</span>
              <span>
                Create new customer &ldquo;{query.trim()}&rdquo;
              </span>
            </button>
          )}

          {/* Exact name collision warning */}
          {exactMatch && (
            <div className="px-3 py-3 border-t border-[#2A2A2A] bg-orange-900/20">
              <p className="text-xs text-orange-400 mb-2">
                A customer named <strong>{exactMatch.name}</strong> already
                exists
                {exactMatch.phone ? ` · ${exactMatch.phone}` : ""}.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectExisting(exactMatch)}
                  className="px-3 py-1 rounded bg-[#EAB308] text-black text-xs font-semibold hover:bg-yellow-400 transition-colors"
                >
                  Yes, same person
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Force user to differentiate the name
                    setQuery(query.trim() + " ");
                  }}
                  className="px-3 py-1 rounded border border-orange-600 text-orange-400 text-xs hover:bg-orange-900/30 transition-colors"
                >
                  Different person — edit name
                </button>
              </div>
            </div>
          )}

          {/* No matches + no text to create */}
          {matches.length === 0 && !exactMatch && !trimmedQuery && (
            <p className="px-3 py-2.5 text-xs text-zinc-500">Start typing…</p>
          )}
        </div>
      )}
    </div>
  );
}
