import { getDailyReport, getReportSummary } from "@/lib/queries";
import Decimal from "decimal.js";

const fmt = (n: Decimal | number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const defaults = defaultDateRange();
  const fromStr = params.from ?? defaults.from;
  const toStr = params.to ?? defaults.to;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const [daily, summary] = await Promise.all([
    getDailyReport(from, to),
    getReportSummary(from, to),
  ]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Reports</h2>

      {/* Date range filter */}
      <form className="mb-6 flex gap-3 items-end">
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-[#EAB308]">
            {fmt(summary.totalRevenue)}
          </p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Sales</p>
          <p className="text-xl font-bold text-white">
            {summary.salesCount}
          </p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Purchases</p>
          <p className="text-xl font-bold text-white">
            {summary.purchasesCount}
          </p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Stock Value (WAC)</p>
          <p className="text-xl font-bold text-zinc-200">
            {fmt(summary.stockValueAtWac)}
          </p>
        </div>
      </div>

      {/* Daily breakdown */}
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Daily Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4 text-right">Sales</th>
              <th className="pb-3 pr-4 text-right">Cash</th>
              <th className="pb-3 pr-4 text-right">M-Pesa</th>
              <th className="pb-3 pr-4 text-right">Debt</th>
              <th className="pb-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr
                key={d.date}
                className="border-b border-[#1C1C1C] hover:bg-[#111]"
              >
                <td className="py-3 pr-4 text-zinc-300">{d.date}</td>
                <td className="py-3 pr-4 text-right text-zinc-400">
                  {d.sales.length}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {fmt(d.cash)}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {fmt(d.mpesa)}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {fmt(d.debt)}
                </td>
                <td className="py-3 text-right font-semibold text-white">
                  {fmt(d.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {daily.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            No sales in this period.
          </p>
        )}
      </div>
    </div>
  );
}
