"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FilterBarProps {
  basePath: string;
  fromStr: string;
  toStr: string;
  today: string;
  /** Extra query params to preserve across preset/date navigation (e.g. tab, view). */
  extraParams?: Record<string, string>;
}

function shiftDate(d: string, days: number, max: string): string {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + days);
  const shifted = dt.toISOString().slice(0, 10);
  return shifted <= max ? shifted : max;
}

export function FilterBar({ basePath, fromStr, toStr, today, extraParams }: FilterBarProps) {
  const router = useRouter();
  const [from, setFrom] = useState(fromStr);
  const [to, setTo] = useState(toStr);

  const buildHref = (f: string, t: string) => {
    const p = new URLSearchParams({ ...extraParams, from: f, to: t });
    return `${basePath}?${p.toString()}`;
  };

  const todayDate = new Date(today + "T12:00:00");
  const weekDate = new Date(todayDate);
  const dow = weekDate.getDay();
  weekDate.setDate(weekDate.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekStart = weekDate.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const presets = [
    { label: "Today", from: today, to: today },
    { label: "This Week", from: weekStart, to: today },
    { label: "This Month", from: monthStart, to: today },
  ];

  const apply = (f: string, t: string) => router.push(buildHref(f, t));

  return (
    <div className="mb-6">
      <div className="flex gap-2 mb-3 flex-wrap">
        {presets.map((p) => {
          const active = fromStr === p.from && toStr === p.to;
          return (
            <Link
              key={p.label}
              href={buildHref(p.from, p.to)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                active
                  ? "bg-[#EAB308] border-[#EAB308] text-black font-semibold"
                  : "bg-[#111] border-[#2A2A2A] text-zinc-400 hover:border-[#EAB308] hover:text-[#EAB308]"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); apply(from, to); }} className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">From</label>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setFrom(shiftDate(from, -1, today))}
              className="px-2 py-2 text-zinc-400 hover:text-white bg-[#1C1C1C] border border-[#2A2A2A] rounded text-sm">‹</button>
            <input
              type="date"
              name="from"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
            />
            <button type="button" onClick={() => setFrom(shiftDate(from, 1, today))}
              disabled={from >= today}
              className="px-2 py-2 text-zinc-400 hover:text-white bg-[#1C1C1C] border border-[#2A2A2A] rounded text-sm disabled:opacity-30">›</button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">To</label>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setTo(shiftDate(to, -1, today))}
              className="px-2 py-2 text-zinc-400 hover:text-white bg-[#1C1C1C] border border-[#2A2A2A] rounded text-sm">‹</button>
            <input
              type="date"
              name="to"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
            />
            <button type="button" onClick={() => setTo(shiftDate(to, 1, today))}
              disabled={to >= today}
              className="px-2 py-2 text-zinc-400 hover:text-white bg-[#1C1C1C] border border-[#2A2A2A] rounded text-sm disabled:opacity-30">›</button>
          </div>
        </div>
        <button type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors">
          Apply
        </button>
      </form>
    </div>
  );
}
