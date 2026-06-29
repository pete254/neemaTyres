"use client";

import Link from "next/link";

interface FilterBarProps {
  basePath: string;
  fromStr: string;
  toStr: string;
  today: string;
}

export function FilterBar({ basePath, fromStr, toStr, today }: FilterBarProps) {
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

  return (
    <div className="mb-6">
      <div className="flex gap-2 mb-3 flex-wrap">
        {presets.map((p) => {
          const active = fromStr === p.from && toStr === p.to;
          return (
            <Link
              key={p.label}
              href={`${basePath}?from=${p.from}&to=${p.to}`}
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
      <form className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toStr}
            className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>
        <button
          type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
