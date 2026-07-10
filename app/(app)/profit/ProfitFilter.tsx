"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function shiftDate(d: string, days: number, max: string): string {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + days);
  const shifted = dt.toISOString().slice(0, 10);
  return shifted <= max ? shifted : max;
}

export default function ProfitFilter({
  fromStr,
  toStr,
  today,
  size,
  brand,
  sizes,
  brands,
}: {
  fromStr: string;
  toStr: string;
  today: string;
  size: string;
  brand: string;
  sizes: string[];
  brands: string[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(fromStr);
  const [to, setTo] = useState(toStr);

  const buildUrl = (over: Partial<{ from: string; to: string; size: string; brand: string }>) => {
    const params = new URLSearchParams();
    params.set("from", over.from ?? from);
    params.set("to", over.to ?? to);
    const s = over.size ?? size;
    const b = over.brand ?? brand;
    if (s) params.set("size", s);
    if (b) params.set("type", b);
    return `/profit?${params}`;
  };

  const inputCls =
    "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";
  const navBtn =
    "px-2 py-2 text-zinc-400 hover:text-white bg-[#1C1C1C] border border-[#2A2A2A] rounded text-sm disabled:opacity-30";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(buildUrl({}));
      }}
      className="mb-6 flex gap-3 items-end flex-wrap"
    >
      <div>
        <label className="block text-xs text-zinc-400 mb-1">From</label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setFrom(shiftDate(from, -1, today))} className={navBtn}>‹</button>
          <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <button type="button" onClick={() => setFrom(shiftDate(from, 1, today))} disabled={from >= today} className={navBtn}>›</button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">To</label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setTo(shiftDate(to, -1, today))} className={navBtn}>‹</button>
          <input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          <button type="button" onClick={() => setTo(shiftDate(to, 1, today))} disabled={to >= today} className={navBtn}>›</button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Size</label>
        <select
          value={size}
          onChange={(e) => router.push(buildUrl({ size: e.target.value }))}
          className={inputCls}
        >
          <option value="">All sizes</option>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}&quot;</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Type</label>
        <select
          value={brand}
          onChange={(e) => router.push(buildUrl({ brand: e.target.value }))}
          className={inputCls}
        >
          <option value="">All types</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
      >
        Apply
      </button>
    </form>
  );
}
