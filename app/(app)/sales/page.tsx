import { getSalesBetween } from "@/lib/queries";
import { FilterBar } from "@/components/FilterBar";
import Decimal from "decimal.js";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = params.from ?? today;
  const toStr = params.to ?? today;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const report = await getSalesBetween(from, to);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Sales</h2>

      <FilterBar basePath="/sales" fromStr={fromStr} toStr={toStr} today={today} />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-[#EAB308]">
            {fmt(report.totalRevenue)}
          </p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Cash</p>
          <p className="text-xl font-bold text-white">{fmt(report.totalCash)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">M-Pesa</p>
          <p className="text-xl font-bold text-white">
            {fmt(report.totalMpesa)}
          </p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Debt</p>
          <p className="text-xl font-bold text-orange-400">
            {fmt(report.totalDebt)}
          </p>
        </div>
      </div>

      {/* Daily breakdown with lines */}
      {report.days.map((day) => (
        <div key={day.date} className="mb-8">
          <div className="flex items-center justify-between mb-2 py-2 border-b border-[#2A2A2A]">
            <h3 className="text-sm font-semibold text-zinc-300">{day.date}</h3>
            <span className="text-sm text-zinc-500">
              {day.salesCount} sale{day.salesCount !== 1 ? "s" : ""} &middot;{" "}
              {fmt(day.revenue)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left">
                  <th className="pb-2 pr-4 font-normal">Item</th>
                  <th className="pb-2 pr-4 font-normal">Customer</th>
                  <th className="pb-2 pr-4 text-right font-normal">Qty</th>
                  <th className="pb-2 pr-4 text-right font-normal">
                    Unit Price
                  </th>
                  <th className="pb-2 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {day.lines.map((line, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1C1C1C] hover:bg-[#111]"
                  >
                    <td className="py-2 pr-4 text-white">{line.variantLabel}</td>
                    <td className="py-2 pr-4 text-zinc-400">
                      {line.customerName ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-300">
                      {line.qty}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-300">
                      {fmt(line.unitPrice)}
                    </td>
                    <td className="py-2 text-right font-semibold text-white">
                      {fmt(line.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {report.days.length === 0 && (
        <p className="text-center text-zinc-500 py-12">
          No sales in this period.
        </p>
      )}
    </div>
  );
}
