"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SaleCard, type SaleCardData, type SaleCardLine } from "../sales/SaleCard";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(n);

export interface DayRow {
  date: string;
  salesCount: number;
  cash: number;
  mpesa: number;
  debt: number;
  revenue: number;
  grossProfit: number;
  saleGroups: Array<SaleCardData & { lines: SaleCardLine[] }>;
}

export function DailyBreakdown({ days }: { days: DayRow[] }) {
  const [selected, setSelected] = useState<DayRow | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4 text-right">Sales</th>
              <th className="pb-3 pr-4 text-right">Cash</th>
              <th className="pb-3 pr-4 text-right">M-Pesa</th>
              <th className="pb-3 pr-4 text-right">Debt</th>
              <th className="pb-3 pr-4 text-right">Revenue</th>
              <th className="pb-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr
                key={d.date}
                onClick={() => setSelected(d)}
                className="border-b border-[#1C1C1C] hover:bg-[#111] cursor-pointer"
                title="Click for the full breakdown of this day"
              >
                <td className="py-3 pr-4 text-[#EAB308] underline decoration-dotted underline-offset-2">
                  {d.date}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-400">{d.salesCount}</td>
                <td className="py-3 pr-4 text-right text-zinc-300">{fmt(d.cash)}</td>
                <td className="py-3 pr-4 text-right text-zinc-300">{fmt(d.mpesa)}</td>
                <td className="py-3 pr-4 text-right text-zinc-300">{fmt(d.debt)}</td>
                <td className="py-3 pr-4 text-right font-semibold text-white">
                  {fmt(d.revenue)}
                </td>
                <td className="py-3 text-right font-semibold text-green-400">
                  {fmt(d.grossProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {days.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No sales in this period.</p>
        )}
      </div>

      {selected && (
        <DayModal day={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function DayModal({ day, onClose }: { day: DayRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl w-full max-w-2xl my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] sticky top-0 bg-[#0A0A0A] rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-white">{day.date}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {day.salesCount} sale{day.salesCount !== 1 ? "s" : ""} &middot;{" "}
              {fmt(day.revenue)} revenue &middot;{" "}
              <span className="text-green-400">{fmt(day.grossProfit)} profit</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/sales?from=${day.date}&to=${day.date}`}
              className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
            >
              Open in Sales
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-zinc-400 hover:text-white text-xl leading-none px-2 py-0.5 rounded hover:bg-[#1A1A1A] transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body: per-sale breakdown */}
        <div className="p-5 space-y-4">
          {day.saleGroups.map((sale) => (
            <SaleCard key={sale.saleId} sale={sale} lines={sale.lines} />
          ))}
          {day.saleGroups.length === 0 && (
            <p className="text-center text-zinc-500 py-8">No sales this day.</p>
          )}
        </div>
      </div>
    </div>
  );
}
