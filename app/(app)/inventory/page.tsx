import Link from "next/link";
import { getInventory, getStockPerformance } from "@/lib/queries";
import type { PerfRow } from "@/lib/queries";

import Decimal from "decimal.js";

const BUCKET_ORDER = ["22.5", "20", "19.5", "17.5", "16", "15", "14", "13"];
const bucketRank = (b: string) => {
  const i = BUCKET_ORDER.indexOf(b);
  return i === -1 ? 99 : i;
};

const fmt = (n: number | Decimal | string) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(n));

interface PageProps {
  searchParams: Promise<{
    search?: string;
    position?: string;
    tab?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab === "performance" ? "performance" : "stock";

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4 print:hidden">Inventory</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#2A2A2A] print:hidden">
        <Link
          href="/inventory"
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === "stock"
              ? "border-[#EAB308] text-[#EAB308]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Stock
        </Link>
        <Link
          href="/inventory?tab=performance"
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === "performance"
              ? "border-[#EAB308] text-[#EAB308]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Performance
        </Link>
      </div>

      {tab === "performance" ? (
        <PerformanceView fromStr={params.from} toStr={params.to} />
      ) : (
        <StockList search={params.search} position={params.position} />
      )}
    </div>
  );
}

async function StockList({
  search,
  position,
}: {
  search?: string;
  position?: string;
}) {
  const raw = await getInventory({ search, position });

  const variants = [...raw].sort((a, b) => {
    const bd = bucketRank(a.sizeBucket) - bucketRank(b.sizeBucket);
    if (bd !== 0) return bd;
    const sd = a.sizeCanonical.localeCompare(b.sizeCanonical);
    if (sd !== 0) return sd;
    return a.brand.name.localeCompare(b.brand.name);
  });

  const totalQty = variants.reduce((s, v) => s + v.qtyOnHand, 0);
  const totalValue = variants.reduce(
    (s, v) => s.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-end gap-3 mb-4 print:hidden">
        <span className="text-sm text-zinc-400">{variants.length} items</span>
        <Link
          href="/variants/new"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + New Tyre Type
        </Link>
        <a
          href="/api/pdf/stock-report"
          target="_blank"
          className="bg-[#4B0082] hover:bg-[#3a006b] text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          ↓ Stock Report PDF
        </a>
      </div>

      {/* Search / filter */}
      <form className="mb-4 flex gap-3 print:hidden">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search size or pattern..."
          className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308] w-64"
        />
        <select
          name="position"
          defaultValue={position ?? ""}
          className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        >
          <option value="">All positions</option>
          <option value="AP">AP</option>
          <option value="DIFF">DIFF</option>
          <option value="STEERING">STEERING</option>
          <option value="NONE">NONE</option>
        </select>
        <button
          type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] print:border-black text-zinc-400 print:text-black text-left">
              <th className="pb-3 pr-4">Size</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Brand</th>
              <th className="pb-3 pr-4">Pos</th>
              <th className="pb-3 pr-4">Sub</th>
              <th className="pb-3 pr-4">Pattern</th>
              <th className="pb-3 pr-4 text-right">Qty</th>
              <th className="pb-3 pr-4 text-right">WAC</th>
              <th className="pb-3 pr-4 text-right">Sell Ref</th>
              <th className="pb-3 pr-4 text-right">Value@WAC</th>
              <th className="pb-3 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const value = new Decimal(v.qtyOnHand).mul(v.wacCost.toString());
              const isNegative = v.qtyOnHand < 0;
              return (
                <tr
                  key={v.id}
                  className={`border-b border-[#1C1C1C] print:border-gray-200 ${
                    isNegative ? "bg-red-950/20 print:bg-red-50" : "hover:bg-[#111] print:bg-white"
                  }`}
                >
                  <td className={`py-2 pr-4 font-mono text-xs ${isNegative ? "text-red-400 print:text-red-600" : "text-white print:text-black"}`}>
                    {v.sizeBucket}
                  </td>
                  <td className={`py-2 pr-4 font-mono text-xs ${isNegative ? "text-red-400 print:text-red-600" : "text-zinc-300 print:text-gray-700"}`}>
                    {v.sizeCanonical}
                  </td>
                  <td className="py-2 pr-4 text-zinc-200 print:text-black">{v.brand.name}</td>
                  <td className="py-2 pr-4 text-zinc-400 print:text-gray-600 text-xs">{v.position}</td>
                  <td className="py-2 pr-4 text-zinc-400 print:text-gray-600 text-xs">{v.subLabel ?? "-"}</td>
                  <td className="py-2 pr-4 text-zinc-400 print:text-gray-600 text-xs">{v.patternCode ?? "-"}</td>
                  <td className={`py-2 pr-4 text-right font-semibold ${isNegative ? "text-red-400 print:text-red-600" : "text-white print:text-black"}`}>
                    {v.qtyOnHand}
                  </td>
                  <td className="py-2 pr-4 text-right text-zinc-300 print:text-gray-700">{fmt(v.wacCost.toString())}</td>
                  <td className="py-2 pr-4 text-right text-zinc-400 print:text-gray-600">
                    {v.referenceSellPrice ? fmt(v.referenceSellPrice.toString()) : "-"}
                  </td>
                  <td className="py-2 pr-4 text-right text-zinc-300 print:text-black print:font-medium">{fmt(value)}</td>
                  <td className="py-2 text-right print:hidden">
                    <Link href={`/variants/${v.id}/edit`} className="text-zinc-500 hover:text-white text-xs">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#2A2A2A] print:border-black font-semibold">
              <td colSpan={6} className="pt-3 text-zinc-400 print:text-gray-700 text-xs">
                {variants.length} variant{variants.length !== 1 ? "s" : ""}
              </td>
              <td className="pt-3 pr-4 text-right text-white print:text-black">{totalQty}</td>
              <td colSpan={2} />
              <td className="pt-3 pr-4 text-right text-[#EAB308] print:text-black print:font-bold">{fmt(totalValue)}</td>
              <td className="print:hidden" />
            </tr>
          </tfoot>
        </table>
        {variants.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No items found.</p>
        )}
      </div>
    </>
  );
}

async function PerformanceView({
  fromStr: fromParam,
  toStr: toParam,
}: {
  fromStr?: string;
  toStr?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const fromStr =
    fromParam ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const toStr = toParam ?? today;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const perf = await getStockPerformance(from, to);

  return (
    <div className="space-y-6">
      {/* Date range */}
      <form className="flex gap-3 items-end flex-wrap">
        <input type="hidden" name="tab" value="performance" />
        <div>
          <label className="block text-xs text-zinc-400 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            max={today}
            className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={toStr}
            max={today}
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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Units Sold</p>
          <p className="text-xl font-bold text-white">{perf.totalUnits}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Revenue</p>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(perf.totalRevenue)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Gross Profit</p>
          <p className={`text-xl font-bold ${perf.totalProfit.gte(0) ? "text-green-400" : "text-red-400"}`}>
            {fmt(perf.totalProfit)}
          </p>
        </div>
      </div>

      {perf.totalUnits === 0 ? (
        <p className="text-center text-zinc-500 py-12">
          No sales in this period.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerfTable
            title="Best-Selling Tyre Types"
            rows={perf.topTypes}
            hrefFor={(r) => `/sales?tab=by-type&variant=${r.key}`}
          />
          <PerfTable
            title="Best-Selling Sizes"
            rows={perf.topSizes}
            hrefFor={(r) => `/inventory?search=${encodeURIComponent(r.key)}`}
          />
        </div>
      )}
    </div>
  );
}

function PerfTable({
  title,
  rows,
  hrefFor,
}: {
  title: string;
  rows: PerfRow[];
  hrefFor: (r: PerfRow) => string;
}) {
  return (
    <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-[#1C1C1C]">
              <th className="px-4 py-2 font-medium w-8">#</th>
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium text-right">Sold</th>
              <th className="px-4 py-2 font-medium text-right">Revenue</th>
              <th className="px-4 py-2 font-medium text-right">Profit</th>
              <th className="px-4 py-2 font-medium text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-b border-[#141414] hover:bg-[#111]">
                <td className="px-4 py-2.5 text-zinc-500">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <Link href={hrefFor(r)} className="text-zinc-200 hover:text-[#EAB308]">
                    {r.label}
                  </Link>
                  {r.sub && <p className="text-xs text-zinc-600">{r.sub}</p>}
                </td>
                <td className="px-4 py-2.5 text-right text-white font-semibold">{r.qtySold}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{fmt(r.revenue)}</td>
                <td className={`px-4 py-2.5 text-right ${r.grossProfit.gte(0) ? "text-green-400" : "text-red-400"}`}>
                  {fmt(r.grossProfit)}
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-400">
                  {r.marginPct.toDecimalPlaces(1).toString()}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
