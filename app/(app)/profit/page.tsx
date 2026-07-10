import Link from "next/link";
import Decimal from "decimal.js";
import { getProfitBreakdown } from "@/lib/queries";
import ProfitFilter from "./ProfitFilter";
import ProfitBreakdown, { type ProfitDayData } from "./ProfitBreakdown";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(n));

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; size?: string; type?: string }>;
}

export default async function ProfitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const defaults = defaultDateRange();
  const fromStr = params.from ?? defaults.from;
  const toStr = params.to ?? defaults.to;
  const size = params.size ?? "";
  const brand = params.type ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const result = await getProfitBreakdown(from, to, {
    size: size || undefined,
    brand: brand || undefined,
  });

  // Decimal → number for the client component (Decimals don't serialize).
  const days: ProfitDayData[] = result.days.map((d) => ({
    date: d.date,
    qty: d.qty,
    revenue: d.revenue.toNumber(),
    cogs: d.cogs.toNumber(),
    grossProfit: d.grossProfit.toNumber(),
    marginPct: d.marginPct.toNumber(),
    rows: d.rows.map((r) => ({
      variantId: r.variantId,
      label: r.label,
      qty: r.qty,
      revenue: r.revenue.toNumber(),
      cogs: r.cogs.toNumber(),
      grossProfit: r.grossProfit.toNumber(),
      marginPct: r.marginPct.toNumber(),
    })),
  }));

  const filtered = Boolean(size || brand);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white transition-colors">← Dashboard</Link>
      </div>
      <h2 className="text-2xl font-bold text-white mb-1">Profit Breakdown</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Gross profit per day — revenue minus cost of goods sold (cost captured at sale time).
        {filtered && " Filtered"}
        {size && ` · size ${size}"`}
        {brand && ` · type ${brand}`}
      </p>

      <ProfitFilter
        fromStr={fromStr}
        toStr={toStr}
        today={today}
        size={size}
        brand={brand}
        sizes={result.sizes}
        brands={result.brands}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Revenue</p>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(result.totalRevenue)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Cost (COGS)</p>
          <p className="text-xl font-bold text-zinc-300">{fmt(result.totalCogs)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Gross Profit</p>
          <p className={`text-xl font-bold ${result.totalProfit.gte(0) ? "text-green-400" : "text-red-400"}`}>
            {fmt(result.totalProfit)}
          </p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Margin · Tyres sold</p>
          <p className="text-xl font-bold text-white">
            {result.marginPct.toFixed(1)}%
            <span className="text-sm font-normal text-zinc-500"> · {result.totalQty}</span>
          </p>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Daily Breakdown
      </h3>
      <ProfitBreakdown days={days} />
    </div>
  );
}
