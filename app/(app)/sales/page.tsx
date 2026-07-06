import Link from "next/link";
import {
  getSalesBetween,
  getStockableVariants,
  getVariantStockLedger,
} from "@/lib/queries";
import type { LedgerRow } from "@/lib/queries";
import { FilterBar } from "@/components/FilterBar";
import { DeleteSaleButton } from "./DeleteSaleButton";
import { SizePicker } from "./SizePicker";
import Decimal from "decimal.js";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    tab?: string;
    bucket?: string;
    variant?: string;
  }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab === "by-type" ? "by-type" : "daily";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Sales</h2>
        <Link
          href="/sales/new"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + Record Sale
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#2A2A2A]">
        <Link
          href="/sales"
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === "daily"
              ? "border-[#EAB308] text-[#EAB308]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Daily
        </Link>
        <Link
          href="/sales?tab=by-type"
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === "by-type"
              ? "border-[#EAB308] text-[#EAB308]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          By Type
        </Link>
      </div>

      {tab === "by-type" ? (
        <ByTypeView bucket={params.bucket} variantId={params.variant} />
      ) : (
        <DailyView fromStr={params.from} toStr={params.to} />
      )}
    </div>
  );
}

async function DailyView({
  fromStr: fromParam,
  toStr: toParam,
}: {
  fromStr?: string;
  toStr?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = fromParam ?? today;
  const toStr = toParam ?? today;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const report = await getSalesBetween(from, to);

  return (
    <>
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
          <p className="text-xl font-bold text-white">{fmt(report.totalMpesa)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Debt</p>
          <p className="text-xl font-bold text-orange-400">{fmt(report.totalDebt)}</p>
        </div>
      </div>

      {/* Per-day, per-sale breakdown */}
      {report.days.map((day) => (
        <div key={day.date} className="mb-8">
          <div className="flex items-center justify-between mb-3 py-2 border-b border-[#2A2A2A]">
            <h3 className="text-sm font-semibold text-zinc-300">{day.date}</h3>
            <span className="text-sm text-zinc-500">
              {day.salesCount} sale{day.salesCount !== 1 ? "s" : ""} &middot;{" "}
              {fmt(day.revenue)}
            </span>
          </div>

          <div className="space-y-4">
            {day.saleGroups.map((sale) => (
              <div
                key={sale.saleId}
                className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-4"
              >
                {/* Sale header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-white">
                      {sale.customerName ?? "Walk-in"}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">{sale.channels}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#EAB308]">
                      {fmt(sale.total)}
                    </span>
                    <Link
                      href={`/sales/${sale.saleId}/invoice`}
                      className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
                    >
                      Invoice
                    </Link>
                    <Link
                      href={`/sales/${sale.saleId}/delivery-note`}
                      className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
                    >
                      Delivery
                    </Link>
                    <Link
                      href={`/sales/${sale.saleId}/edit`}
                      className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
                    >
                      Edit
                    </Link>
                    <DeleteSaleButton saleId={sale.saleId} />
                  </div>
                </div>

                {/* Lines */}
                <table className="w-full text-sm">
                  <tbody>
                    {sale.lines.map((line, i) => (
                      <tr key={i} className="border-t border-[#1C1C1C]">
                        <td className="py-1.5 pr-4 text-zinc-300">{line.variantLabel}</td>
                        <td className="py-1.5 pr-4 text-right text-zinc-500">×{line.qty}</td>
                        <td className="py-1.5 pr-4 text-right text-zinc-400">
                          {fmt(line.unitPrice)}
                        </td>
                        <td className="py-1.5 text-right text-zinc-200 font-medium">
                          {fmt(line.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      ))}

      {report.days.length === 0 && (
        <p className="text-center text-zinc-500 py-12">No sales in this period.</p>
      )}
    </>
  );
}

const ROW_LABEL: Record<string, string> = {
  OPENING: "Opening",
  PURCHASE: "Purchase",
  SALE: "Sale",
  SALE_RETURN: "Return in",
  PURCHASE_RETURN: "Return out",
};

async function ByTypeView({
  bucket: bucketParam,
  variantId,
}: {
  bucket?: string;
  variantId?: string;
}) {
  const variants = await getStockableVariants();

  // Fall back to the selected variant's bucket if none is given in the URL.
  const selectedVariant = variantId
    ? variants.find((v) => v.id === variantId)
    : undefined;
  const bucket = bucketParam ?? selectedVariant?.sizeBucket;

  const buckets = Array.from(new Set(variants.map((v) => v.sizeBucket))).sort();
  const bucketVariants = bucket
    ? variants.filter((v) => v.sizeBucket === bucket)
    : [];
  const bucketTotalInStock = bucketVariants.reduce((s, v) => s + v.qtyOnHand, 0);

  const ledger = variantId ? await getVariantStockLedger(variantId) : null;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-zinc-500 mb-2">
          Select size — tyres in that size are listed below, most recently stocked first
        </label>
        <SizePicker buckets={buckets} selected={bucket} />
      </div>

      {!bucket && (
        <p className="text-center text-zinc-500 py-12">
          Select a size to list its tyres.
        </p>
      )}

      {bucket && (
        <>
          {/* Bucket summary */}
          <div className="flex items-center justify-between bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-3">
            <span className="text-sm text-zinc-300">
              Size <span className="font-semibold text-white">{bucket}&quot;</span> ·{" "}
              {bucketVariants.length} tyre type{bucketVariants.length !== 1 ? "s" : ""}
            </span>
            <span className="text-sm text-zinc-400">
              Total in stock:{" "}
              <span className="font-bold text-[#EAB308]">{bucketTotalInStock}</span>
            </span>
          </div>

          {/* Master-detail: tyre list (left) + ledger (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6">
            {/* Left: scrollable list of tyres in this bucket */}
            <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg overflow-hidden self-start w-full">
              <div className="px-3 py-2 text-xs text-zinc-500 border-b border-[#1E1E1E]">
                Tyres in {bucket}&quot;
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {bucketVariants.map((v) => {
                  const active = v.id === variantId;
                  return (
                    <Link
                      key={v.id}
                      href={`/sales?tab=by-type&bucket=${encodeURIComponent(bucket)}&variant=${v.id}`}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[#141414] text-sm transition-colors ${
                        active
                          ? "bg-[#1C1A00] text-[#EAB308]"
                          : "text-zinc-300 hover:bg-[#141414]"
                      }`}
                    >
                      <span className="truncate">{v.label}</span>
                      <span
                        className={`shrink-0 text-xs ${
                          v.qtyOnHand < 1 ? "text-red-400" : "text-zinc-500"
                        }`}
                      >
                        {v.qtyOnHand}
                      </span>
                    </Link>
                  );
                })}
                {bucketVariants.length === 0 && (
                  <p className="px-3 py-6 text-center text-zinc-600 text-sm">
                    No tyres in this size.
                  </p>
                )}
              </div>
            </div>

            {/* Right: ledger for the selected tyre */}
            <div className="min-w-0">
              {!variantId && (
                <p className="text-center text-zinc-500 py-12">
                  Select a tyre on the left to view its stock ledger.
                </p>
              )}

              {variantId && !ledger && (
                <p className="text-center text-zinc-500 py-12">Tyre type not found.</p>
              )}

              {ledger && <LedgerPanel ledger={ledger} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LedgerPanel({
  ledger,
}: {
  ledger: NonNullable<Awaited<ReturnType<typeof getVariantStockLedger>>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">{ledger.label}</h3>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Starting stock</p>
          <p className="text-xl font-bold text-white">{ledger.openingQty}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Movements</p>
          <p className="text-xl font-bold text-white">{ledger.rows.length - 1}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Currently in stock</p>
          <p className="text-xl font-bold text-[#EAB308]">{ledger.currentStock}</p>
        </div>
      </div>

      {/* Ledger table */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-[#2A2A2A]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Movement</th>
              <th className="px-4 py-3 font-medium">Detail</th>
              <th className="px-4 py-3 font-medium text-right">In</th>
              <th className="px-4 py-3 font-medium text-right">Out</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.map((row, i) => (
              <LedgerRowView key={i} row={row} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#2A2A2A] font-semibold">
              <td className="px-4 py-3 text-white" colSpan={5}>
                Currently in stock
              </td>
              <td className="px-4 py-3 text-right text-[#EAB308]">
                {ledger.currentStock}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {ledger.rows[ledger.rows.length - 1].balance !== ledger.currentStock && (
        <p className="text-xs text-orange-400">
          Note: the ledger balance (
          {ledger.rows[ledger.rows.length - 1].balance}) does not match the
          current stock on hand ({ledger.currentStock}). This may indicate a
          manual adjustment or data discrepancy.
        </p>
      )}
    </div>
  );
}

function LedgerRowView({ row }: { row: LedgerRow }) {
  const isOpening = row.kind === "OPENING";
  return (
    <tr className={`border-t border-[#1C1C1C] ${isOpening ? "bg-[#111]/40" : ""}`}>
      <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">
        {row.date ? new Date(row.date).toISOString().slice(0, 10) : "—"}
      </td>
      <td className="px-4 py-2.5 text-zinc-300">{ROW_LABEL[row.kind] ?? row.kind}</td>
      <td className="px-4 py-2.5 text-zinc-500">{row.description}</td>
      <td className="px-4 py-2.5 text-right text-green-400">
        {row.qtyIn > 0 ? `+${row.qtyIn}` : ""}
      </td>
      <td className="px-4 py-2.5 text-right text-red-400">
        {row.qtyOut > 0 ? `−${row.qtyOut}` : ""}
      </td>
      <td className="px-4 py-2.5 text-right text-zinc-200 font-medium">
        {row.balance}
      </td>
    </tr>
  );
}
