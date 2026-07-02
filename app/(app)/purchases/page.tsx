import Link from "next/link";
import { getPurchasesBetween } from "@/lib/queries";
import { FilterBar } from "@/components/FilterBar";
import { DeletePurchaseButton } from "./DeletePurchaseButton";
import Decimal from "decimal.js";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function PurchasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = params.from ?? today;
  const toStr = params.to ?? today;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const report = await getPurchasesBetween(from, to);

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

      <FilterBar
        basePath="/purchases"
        fromStr={fromStr}
        toStr={toStr}
        today={today}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Cost</p>
          <p className="text-xl font-bold text-blue-400">
            {fmt(report.totalCost)}
          </p>
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
                    <span className="ml-2 text-xs text-zinc-500">
                      {purchase.terms}
                    </span>
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
        <p className="text-center text-zinc-500 py-12">
          No purchases in this period.
        </p>
      )}
    </div>
  );
}
