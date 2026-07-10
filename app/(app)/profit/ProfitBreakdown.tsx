"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export interface ProfitRowData {
  variantId: string;
  label: string;
  qty: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
}

export interface ProfitDayData {
  date: string;
  qty: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  rows: ProfitRowData[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);

const dateLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const profitCls = (n: number) => (n >= 0 ? "text-green-400" : "text-red-400");

function DayRow({ day, defaultOpen }: { day: ProfitDayData; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#2A2A2A] rounded-lg overflow-hidden bg-[#111]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#161616] transition-colors"
      >
        <ChevronRight
          size={16}
          className={`text-zinc-500 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-sm font-medium text-white w-44 flex-shrink-0">{dateLabel(day.date)}</span>
        <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{day.qty} tyre{day.qty === 1 ? "" : "s"}</span>
        <span className="hidden sm:inline text-xs text-zinc-400 flex-1 text-right pr-4">
          Rev {fmt(day.revenue)} &middot; Cost {fmt(day.cogs)}
        </span>
        <span className={`text-sm font-bold ${profitCls(day.grossProfit)} w-32 text-right flex-shrink-0`}>
          {fmt(day.grossProfit)}
        </span>
        <span className="text-xs text-zinc-500 w-16 text-right flex-shrink-0">
          {day.marginPct.toFixed(1)}%
        </span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-[#2A2A2A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left text-xs">
                <th className="py-2 px-4 font-medium">Tyre type</th>
                <th className="py-2 px-4 font-medium text-right">Qty</th>
                <th className="py-2 px-4 font-medium text-right">Revenue</th>
                <th className="py-2 px-4 font-medium text-right">Cost (COGS)</th>
                <th className="py-2 px-4 font-medium text-right">Gross Profit</th>
                <th className="py-2 px-4 font-medium text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {day.rows.map((r) => (
                <tr key={r.variantId} className="border-t border-[#1C1C1C]">
                  <td className="py-2 px-4 text-zinc-200">{r.label}</td>
                  <td className="py-2 px-4 text-right text-zinc-400">{r.qty}</td>
                  <td className="py-2 px-4 text-right text-zinc-300">{fmt(r.revenue)}</td>
                  <td className="py-2 px-4 text-right text-zinc-500">{fmt(r.cogs)}</td>
                  <td className={`py-2 px-4 text-right font-semibold ${profitCls(r.grossProfit)}`}>{fmt(r.grossProfit)}</td>
                  <td className="py-2 px-4 text-right text-zinc-400">{r.marginPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#2A2A2A] text-xs">
                <td className="py-2 px-4 text-zinc-500 font-medium">Day total</td>
                <td className="py-2 px-4 text-right text-zinc-400">{day.qty}</td>
                <td className="py-2 px-4 text-right text-zinc-300">{fmt(day.revenue)}</td>
                <td className="py-2 px-4 text-right text-zinc-500">{fmt(day.cogs)}</td>
                <td className={`py-2 px-4 text-right font-bold ${profitCls(day.grossProfit)}`}>{fmt(day.grossProfit)}</td>
                <td className="py-2 px-4 text-right text-zinc-400">{day.marginPct.toFixed(1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProfitBreakdown({ days }: { days: ProfitDayData[] }) {
  if (days.length === 0) {
    return <p className="text-center text-zinc-500 py-12">No sales in this period.</p>;
  }
  return (
    <div className="space-y-2">
      {days.map((day, i) => (
        <DayRow key={day.date} day={day} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
