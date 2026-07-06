import Link from "next/link";
import { getInventory, getStockPerformance, getStaleStock } from "@/lib/queries";
import type { PerfRow, StaleItem } from "@/lib/queries";

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
    view?: string;
    stale?: string;
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
        <PerformanceView
          fromStr={params.from}
          toStr={params.to}
          view={params.view === "size" ? "size" : "type"}
          staleParam={params.stale}
        />
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

const STALE_PRESETS = [30, 60, 90, 180];

async function PerformanceView({
  fromStr: fromParam,
  toStr: toParam,
  view,
  staleParam,
}: {
  fromStr?: string;
  toStr?: string;
  view: "type" | "size";
  staleParam?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const fromStr =
    fromParam ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const toStr = toParam ?? today;
  const staleDays = STALE_PRESETS.includes(Number(staleParam))
    ? Number(staleParam)
    : 90;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const [perf, stale] = await Promise.all([
    getStockPerformance(from, to),
    getStaleStock(staleDays),
  ]);

  // Preserve current filters when building sub-navigation links.
  const hrefWith = (o: { view?: string; stale?: number }) => {
    const p = new URLSearchParams({ tab: "performance", from: fromStr, to: toStr });
    p.set("view", o.view ?? view);
    p.set("stale", String(o.stale ?? staleDays));
    return `/inventory?${p.toString()}`;
  };

  const rows = view === "size" ? perf.topSizes : perf.topTypes;
  const maxUnits = rows.reduce((m, r) => Math.max(m, r.qtySold), 0) || 1;

  return (
    <div className="space-y-8">
      {/* Date range */}
      <form className="flex gap-3 items-end flex-wrap">
        <input type="hidden" name="tab" value="performance" />
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="stale" value={staleDays} />
        <div>
          <label className="block text-xs text-zinc-400 mb-1">From</label>
          <input type="date" name="from" defaultValue={fromStr} max={today}
            className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">To</label>
          <input type="date" name="to" defaultValue={toStr} max={today}
            className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]" />
        </div>
        <button type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors">
          Apply
        </button>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Units Sold" value={String(perf.totalUnits)} tone="white" />
        <Kpi label="Revenue" value={fmt(perf.totalRevenue)} tone="yellow" />
        <Kpi label="Gross Profit" value={fmt(perf.totalProfit)} tone={perf.totalProfit.gte(0) ? "green" : "red"} />
        <Kpi label="Stock Value" value={fmt(stale.totalStockValue)} tone="white" />
        <Kpi
          label={`Stale ≥ ${staleDays}d`}
          value={fmt(stale.staleValue)}
          sub={`${stale.staleCount} item${stale.staleCount !== 1 ? "s" : ""}`}
          tone={stale.staleValue.gt(0) ? "orange" : "white"}
        />
      </div>

      {/* Best sellers with Type / Size toggle */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-zinc-300">
            Best Sellers <span className="text-zinc-600">· {fromStr} → {toStr}</span>
          </h3>
          <div className="flex gap-1 bg-[#111] border border-[#2A2A2A] rounded-lg p-1">
            <Link href={hrefWith({ view: "type" })}
              className={`px-3 py-1 text-xs font-medium rounded ${view === "type" ? "bg-[#EAB308] text-black" : "text-zinc-400 hover:text-white"}`}>
              By Type
            </Link>
            <Link href={hrefWith({ view: "size" })}
              className={`px-3 py-1 text-xs font-medium rounded ${view === "size" ? "bg-[#EAB308] text-black" : "text-zinc-400 hover:text-white"}`}>
              By Size
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-zinc-500 py-12 bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg">
            No sales in this period.
          </p>
        ) : (
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg divide-y divide-[#141414]">
            {rows.map((r, i) => (
              <BarRow
                key={r.key}
                rank={i + 1}
                row={r}
                pct={(r.qtySold / maxUnits) * 100}
                href={view === "size"
                  ? `/inventory?search=${encodeURIComponent(r.key)}`
                  : `/sales?tab=by-type&variant=${r.key}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Stale / slow-moving stock */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Slow-Moving &amp; Stale Stock</h3>
            <p className="text-xs text-zinc-600">In-stock items with no sale in the selected window — capital sitting on the shelf.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Stale after</span>
            <div className="flex gap-1 bg-[#111] border border-[#2A2A2A] rounded-lg p-1">
              {STALE_PRESETS.map((d) => (
                <Link key={d} href={hrefWith({ stale: d })}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${staleDays === d ? "bg-[#EAB308] text-black" : "text-zinc-400 hover:text-white"}`}>
                  {d}d
                </Link>
              ))}
            </div>
          </div>
        </div>
        <StaleTable items={stale.items} thresholdDays={staleDays} />
      </section>
    </div>
  );
}

function Kpi({
  label, value, sub, tone,
}: {
  label: string; value: string; sub?: string;
  tone: "white" | "yellow" | "green" | "red" | "orange";
}) {
  const color = {
    white: "text-white", yellow: "text-[#EAB308]", green: "text-green-400",
    red: "text-red-400", orange: "text-orange-400",
  }[tone];
  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarRow({
  rank, row, pct, href,
}: {
  rank: number; row: PerfRow; pct: number; href: string;
}) {
  return (
    <div className="px-4 py-3 hover:bg-[#111] transition-colors">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-zinc-600 w-4 shrink-0">{rank}</span>
          <Link href={href} className="text-sm text-zinc-200 hover:text-[#EAB308] truncate">
            {row.label}
          </Link>
          {row.sub && <span className="text-xs text-zinc-600 shrink-0 hidden sm:inline">{row.sub}</span>}
        </div>
        <div className="flex items-center gap-4 shrink-0 text-right">
          <span className="text-sm font-semibold text-white">{row.qtySold} sold</span>
          <span className="text-xs text-zinc-400 w-24 hidden sm:inline">{fmt(row.revenue)}</span>
          <span className={`text-xs w-12 hidden md:inline ${row.grossProfit.gte(0) ? "text-green-400" : "text-red-400"}`}>
            {row.marginPct.toDecimalPlaces(0).toString()}%
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-[#1C1C1C] rounded-full overflow-hidden">
        <div className="h-full bg-[#EAB308] rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

function StaleTable({ items, thresholdDays }: { items: StaleItem[]; thresholdDays: number }) {
  if (items.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-12 bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg">
        Nothing in stock.
      </p>
    );
  }
  return (
    <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[620px]">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-[#2A2A2A]">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium text-right">In Stock</th>
            <th className="px-4 py-3 font-medium text-right">Value @WAC</th>
            <th className="px-4 py-3 font-medium text-right">Last Sold</th>
            <th className="px-4 py-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const isStale =
              it.daysSinceLastSale === null || it.daysSinceLastSale >= thresholdDays;
            return (
              <tr key={it.variantId} className="border-b border-[#141414] hover:bg-[#111]">
                <td className="px-4 py-2.5">
                  <Link href={`/sales?tab=by-type&variant=${it.variantId}`} className="text-zinc-200 hover:text-[#EAB308]">
                    {it.label}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-zinc-500 font-mono text-xs">{it.sizeBucket}&quot;</td>
                <td className="px-4 py-2.5 text-right text-white font-semibold">{it.qtyOnHand}</td>
                <td className="px-4 py-2.5 text-right text-zinc-300">{fmt(it.stockValue)}</td>
                <td className="px-4 py-2.5 text-right text-zinc-400">
                  {it.lastSoldAt
                    ? `${new Date(it.lastSoldAt).toISOString().slice(0, 10)} (${it.daysSinceLastSale}d)`
                    : "Never"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {it.lastSoldAt === null ? (
                    <span className="text-xs font-medium text-red-400 bg-red-950/40 border border-red-900/50 rounded px-2 py-0.5">Never sold</span>
                  ) : isStale ? (
                    <span className="text-xs font-medium text-orange-400 bg-orange-950/30 border border-orange-900/50 rounded px-2 py-0.5">Stale</span>
                  ) : (
                    <span className="text-xs font-medium text-green-400/80">Active</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
