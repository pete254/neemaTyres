import Link from "next/link";
import { getPurchasesBetween, getPurchasePerformance } from "@/lib/queries";
import type { PurchasePerfRow } from "@/lib/queries";
import { FilterBar } from "@/components/FilterBar";
import { DeletePurchaseButton } from "./DeletePurchaseButton";
import Decimal from "decimal.js";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; tab?: string; view?: string }>;
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
          fromStr={params.from}
          toStr={params.to}
          view={params.view === "size" ? "size" : "type"}
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
  fromStr: fromParam,
  toStr: toParam,
  view,
}: {
  fromStr?: string;
  toStr?: string;
  view: "type" | "size";
}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthAgo = new Date(now);
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 29);
  const fromStr = fromParam ?? monthAgo.toISOString().slice(0, 10);
  const toStr = toParam ?? today;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const perf = await getPurchasePerformance(from, to);

  const hrefWith = (o: { view?: string }) => {
    const p = new URLSearchParams({ tab: "by-type", from: fromStr, to: toStr });
    p.set("view", o.view ?? view);
    return `/purchases?${p.toString()}`;
  };

  const rows = view === "size" ? perf.bySize : perf.byType;
  const maxUnits = rows.reduce((m, r) => Math.max(m, r.qty), 0) || 1;

  const toggleBtn = (target: "type" | "size", label: string) => (
    <Link
      href={hrefWith({ view: target })}
      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
        view === target
          ? "bg-[#EAB308] text-black"
          : "bg-[#1C1C1C] border border-[#2A2A2A] text-zinc-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <FilterBar
        basePath="/purchases"
        fromStr={fromStr}
        toStr={toStr}
        today={today}
        extraParams={{ tab: "by-type", view }}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Units Purchased</p>
          <p className="text-xl font-bold text-white">{perf.totalUnits}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-blue-400">{fmt(perf.totalCost)}</p>
        </div>
      </div>

      {/* Type / Size toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500 mr-1">Group by:</span>
        {toggleBtn("type", "Tyre Type")}
        {toggleBtn("size", "Size")}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">{view === "size" ? "Size" : "Tyre Type"}</th>
              <th className="pb-3 pr-4">{view === "size" ? "Types" : "Brand"}</th>
              <th className="pb-3 pr-4 text-right">Units</th>
              <th className="pb-3 pr-4 text-right">Avg Unit Cost</th>
              <th className="pb-3 text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: PurchasePerfRow) => (
              <tr key={r.key} className="border-b border-[#1C1C1C] hover:bg-[#111]">
                <td className="py-2.5 pr-4 text-zinc-200">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-1.5 rounded-full bg-blue-500/70"
                      style={{ width: `${Math.max(6, (r.qty / maxUnits) * 120)}px` }}
                    />
                    {r.label}
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-zinc-500 text-xs">{r.sub ?? "—"}</td>
                <td className="py-2.5 pr-4 text-right text-white font-semibold">{r.qty}</td>
                <td className="py-2.5 pr-4 text-right text-zinc-400">{fmt(r.avgUnitCost)}</td>
                <td className="py-2.5 text-right text-blue-400 font-medium">{fmt(r.totalCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#2A2A2A] font-semibold">
              <td className="pt-3 pr-4 text-zinc-400 text-xs" colSpan={2}>
                {rows.length} {view === "size" ? "size(s)" : "type(s)"}
              </td>
              <td className="pt-3 pr-4 text-right text-white">{perf.totalUnits}</td>
              <td />
              <td className="pt-3 text-right text-[#EAB308]">{fmt(perf.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No purchases in this period.</p>
        )}
      </div>
    </>
  );
}
