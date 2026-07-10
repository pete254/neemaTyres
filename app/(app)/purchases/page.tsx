import Link from "next/link";
import {
  getPurchasesBetween,
  getStockableVariants,
  getVariantPurchases,
} from "@/lib/queries";
import { FilterBar } from "@/components/FilterBar";
import { DeletePurchaseButton } from "./DeletePurchaseButton";
import { SizePicker } from "../sales/SizePicker";
import { PurchaseTxnFilter } from "./PurchaseTxnFilter";
import Decimal from "decimal.js";

const BUCKET_ORDER = ["22.5", "20", "19.5", "17.5", "16", "15", "14", "13"];
const bucketRank = (b: string) => {
  const i = BUCKET_ORDER.indexOf(b);
  return i === -1 ? 99 : i;
};

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

export default async function PurchasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab === "by-type" ? "by-type" : "daily";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Purchases</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/variants/new"
            className="border border-[#2A2A2A] hover:border-zinc-500 text-zinc-300 hover:text-white rounded px-3 py-2 text-sm transition-colors"
          >
            + Tyre Type
          </Link>
          <Link
            href="/suppliers/new"
            className="border border-[#2A2A2A] hover:border-zinc-500 text-zinc-300 hover:text-white rounded px-3 py-2 text-sm transition-colors"
          >
            + Supplier
          </Link>
          <Link
            href="/purchases/new"
            className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
          >
            + Record Purchase
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#2A2A2A]">
        <Link
          href="/purchases"
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === "daily"
              ? "border-[#EAB308] text-[#EAB308]"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Daily
        </Link>
        <Link
          href="/purchases?tab=by-type"
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
        <ByTypeView
          bucket={params.bucket}
          variantId={params.variant}
          fromStr={params.from}
          toStr={params.to}
        />
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

  const report = await getPurchasesBetween(from, to);

  return (
    <>
      <FilterBar basePath="/purchases" fromStr={fromStr} toStr={toStr} today={today} />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-blue-400">{fmt(report.totalCost)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Purchase Orders</p>
          <p className="text-xl font-bold text-white">
            {report.days.reduce((sum, d) => sum + d.purchasesCount, 0)}
          </p>
        </div>
      </div>

      {/* Per-day, per-purchase breakdown */}
      {report.days.map((day) => (
        <div key={day.date} className="mb-8">
          <div className="flex items-center justify-between mb-3 py-2 border-b border-[#2A2A2A]">
            <h3 className="text-sm font-semibold text-zinc-300">{day.date}</h3>
            <span className="text-sm text-zinc-500">
              {day.purchasesCount} order{day.purchasesCount !== 1 ? "s" : ""}{" "}
              &middot; {fmt(day.totalCost)}
            </span>
          </div>

          <div className="space-y-4">
            {day.purchaseGroups.map((purchase) => (
              <div
                key={purchase.purchaseId}
                className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-white">
                      {purchase.supplierName}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">{purchase.terms}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-blue-400">
                      {fmt(purchase.total)}
                    </span>
                    <Link
                      href={`/purchases/${purchase.purchaseId}/edit`}
                      className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
                    >
                      Edit
                    </Link>
                    <DeletePurchaseButton purchaseId={purchase.purchaseId} />
                  </div>
                </div>

                <table className="w-full text-sm">
                  <tbody>
                    {purchase.lines.map((line, i) => (
                      <tr key={i} className="border-t border-[#1C1C1C]">
                        <td className="py-1.5 pr-4 text-zinc-300">{line.variantLabel}</td>
                        <td className="py-1.5 pr-4 text-right text-zinc-500">×{line.qty}</td>
                        <td className="py-1.5 pr-4 text-right text-zinc-400">
                          {fmt(line.unitCost)}
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
        <p className="text-center text-zinc-500 py-12">No purchases in this period.</p>
      )}
    </>
  );
}

async function ByTypeView({
  bucket: bucketParam,
  variantId,
  fromStr: fromParam,
  toStr: toParam,
}: {
  bucket?: string;
  variantId?: string;
  fromStr?: string;
  toStr?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const variants = await getStockableVariants();

  // Fall back to the selected variant's bucket if none is given in the URL.
  const selectedVariant = variantId
    ? variants.find((v) => v.id === variantId)
    : undefined;
  const bucket = bucketParam ?? selectedVariant?.sizeBucket;

  const buckets = Array.from(new Set(variants.map((v) => v.sizeBucket))).sort(
    (a, b) => bucketRank(a) - bucketRank(b) || a.localeCompare(b)
  );
  const bucketVariants = bucket
    ? variants.filter((v) => v.sizeBucket === bucket)
    : [];

  // Optional date narrowing — absent means "all purchases".
  const from = fromParam ? new Date(fromParam + "T00:00:00Z") : undefined;
  const to = toParam ? new Date(toParam + "T23:59:59Z") : undefined;
  const purchases = variantId ? await getVariantPurchases(variantId, from, to) : null;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-zinc-500 mb-2">
          Select a size — the tyre types in that size are listed below, most recently stocked first
        </label>
        <SizePicker buckets={buckets} selected={bucket} basePath="/purchases" />
      </div>

      {!bucket && (
        <p className="text-center text-zinc-500 py-12">Select a size to list its tyres.</p>
      )}

      {bucket && (
        <>
          <div className="flex items-center justify-between bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-3">
            <span className="text-sm text-zinc-300">
              Size <span className="font-semibold text-white">{bucket}&quot;</span> ·{" "}
              {bucketVariants.length} tyre type{bucketVariants.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Master-detail: tyre list (left) + purchase transactions (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6">
            {/* Left: tyres in this bucket */}
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
                      href={`/purchases?tab=by-type&bucket=${encodeURIComponent(bucket)}&variant=${v.id}`}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[#141414] text-sm transition-colors ${
                        active ? "bg-[#1C1A00] text-[#EAB308]" : "text-zinc-300 hover:bg-[#141414]"
                      }`}
                    >
                      <span className="truncate">{v.label}</span>
                      <span className={`shrink-0 text-xs ${v.qtyOnHand < 1 ? "text-red-400" : "text-zinc-500"}`}>
                        {v.qtyOnHand}
                      </span>
                    </Link>
                  );
                })}
                {bucketVariants.length === 0 && (
                  <p className="px-3 py-6 text-center text-zinc-600 text-sm">No tyres in this size.</p>
                )}
              </div>
            </div>

            {/* Right: purchase transactions for the selected tyre */}
            <div className="min-w-0">
              {!variantId && (
                <p className="text-center text-zinc-500 py-12">
                  Select a tyre on the left to view its purchase transactions.
                </p>
              )}
              {variantId && !purchases && (
                <p className="text-center text-zinc-500 py-12">Tyre type not found.</p>
              )}
              {purchases && (
                <PurchaseTxnPanel
                  purchases={purchases}
                  bucket={bucket}
                  fromStr={fromParam ?? ""}
                  toStr={toParam ?? ""}
                  today={today}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PurchaseTxnPanel({
  purchases,
  bucket,
  fromStr,
  toStr,
  today,
}: {
  purchases: NonNullable<Awaited<ReturnType<typeof getVariantPurchases>>>;
  bucket: string;
  fromStr: string;
  toStr: string;
  today: string;
}) {
  const ranged = Boolean(fromStr || toStr);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{purchases.label}</h3>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Purchases</p>
          <p className="text-xl font-bold text-white">{purchases.count}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Units Bought</p>
          <p className="text-xl font-bold text-white">{purchases.totalQty}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Avg Unit Cost</p>
          <p className="text-xl font-bold text-zinc-200">{fmt(purchases.avgUnitCost)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-blue-400">{fmt(purchases.totalCost)}</p>
        </div>
      </div>

      {/* Date filter (optional) */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">
          Showing {ranged ? "purchases in the selected range" : "all purchases"} — narrow by date:
        </p>
        <PurchaseTxnFilter
          bucket={bucket}
          variantId={purchases.variantId}
          fromStr={fromStr}
          toStr={toStr}
          today={today}
        />
      </div>

      {/* Transactions */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-[#2A2A2A]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Terms</th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {purchases.txns.map((t, i) => (
              <tr key={`${t.purchaseId}-${i}`} className="border-t border-[#1C1C1C] hover:bg-[#111]">
                <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">
                  {t.date.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-2.5 text-zinc-200">{t.supplierName}</td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{t.terms}</td>
                <td className="px-4 py-2.5 text-right text-white font-semibold">{t.qty}</td>
                <td className="px-4 py-2.5 text-right text-zinc-400">{fmt(t.unitCost)}</td>
                <td className="px-4 py-2.5 text-right text-blue-400 font-medium">{fmt(t.lineTotal)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/purchases/${t.purchaseId}/edit`}
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#2A2A2A] font-semibold">
              <td className="px-4 py-3 text-zinc-400 text-xs" colSpan={3}>
                {purchases.count} purchase{purchases.count !== 1 ? "s" : ""}
              </td>
              <td className="px-4 py-3 text-right text-white">{purchases.totalQty}</td>
              <td />
              <td className="px-4 py-3 text-right text-[#EAB308]">{fmt(purchases.totalCost)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        {purchases.txns.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            No purchases for this tyre{ranged ? " in the selected range" : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
