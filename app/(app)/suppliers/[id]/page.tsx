import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFilteredSupplierStatement,
  parseStatementFilters,
  statementFiltersToQuery,
} from "@/lib/queries";
import { SharePdfButton } from "@/components/SharePdfButton";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

const inputCls =
  "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SupplierStatementPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const filters = parseStatementFilters(await searchParams);

  let data;
  try {
    data = await getFilteredSupplierStatement(id, filters);
  } catch {
    notFound();
  }

  const { supplier, entries } = data;

  const query = statementFiltersToQuery(filters);
  const pdfUrl = `/api/pdf/supplier-statement/${id}${query ? `?${query}` : ""}`;
  const downloadUrl = `${pdfUrl}${query ? "&" : "?"}download=1`;
  const pdfFilename = `statement-${supplier.name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}.pdf`;
  const btnCls =
    "bg-[#4B0082] hover:bg-[#3a006b] disabled:opacity-60 text-white font-semibold rounded px-4 py-2 text-sm transition-colors";

  // Quick date presets keep the other filters.
  const today = new Date().toISOString().slice(0, 10);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const lastMonthStart = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
  const presetHref = (from?: string, to?: string) => {
    const q = statementFiltersToQuery({ ...filters, from, to });
    return `/suppliers/${id}${q ? `?${q}` : ""}`;
  };
  const presets = [
    { label: "This month", from: today.slice(0, 7) + "-01", to: today },
    { label: "Last month", from: lastMonthStart, to: lastMonthEnd },
    { label: "This year", from: `${y}-01-01`, to: today },
    { label: "All time", from: undefined, to: undefined },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/suppliers"
            className="text-sm text-zinc-400 hover:text-white mb-2 inline-block"
          >
            &larr; Suppliers
          </Link>
          <h2 className="text-2xl font-bold text-white">{supplier.name}</h2>
          <p className="text-sm text-zinc-400">
            Current balance:{" "}
            <span className="font-semibold text-[#EAB308]">
              {fmt(data.currentBalance.toString())}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href={pdfUrl} target="_blank" className={btnCls}>
            View PDF
          </a>
          <a href={downloadUrl} className={btnCls}>
            ↓ Download
          </a>
          <SharePdfButton
            url={pdfUrl}
            filename={pdfFilename}
            title={`Statement — ${supplier.name}`}
            className={btnCls}
          />
        </div>
      </div>

      {/* Filters — plain GET form so the URL (and PDF link) carries them */}
      <form
        method="get"
        className="mb-3 flex flex-wrap items-end gap-3 rounded border border-[#2A2A2A] p-3"
      >
        <div>
          <label className="block text-xs text-zinc-400 mb-1">From</label>
          <input type="date" name="from" defaultValue={filters.from} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">To</label>
          <input type="date" name="to" defaultValue={filters.to} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Type</label>
          <select name="type" defaultValue={filters.type} className={inputCls}>
            <option value="all">All entries</option>
            <option value="purchase">Purchases</option>
            <option value="payment">Payments</option>
            <option value="return">Purchase returns</option>
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-zinc-400 mb-1">Search</label>
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="e.g. 315/80 or Bridgestone"
            className={`${inputCls} w-full`}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300 pb-2">
          <input
            type="checkbox"
            name="hideReversals"
            value="1"
            defaultChecked={filters.hideReversals}
          />
          Hide reversals{data.reversalCount ? ` (${data.reversalCount})` : ""}
        </label>
        <button
          type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          Apply
        </button>
        {(data.isFiltered || filters.hideReversals) && (
          <Link
            href={`/suppliers/${id}`}
            className="text-sm text-zinc-400 hover:text-white pb-2"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {presets.map((p) => {
          const active = filters.from === p.from && filters.to === p.to;
          return (
            <Link
              key={p.label}
              href={presetHref(p.from, p.to)}
              className={`rounded-full border px-3 py-1 ${
                active
                  ? "border-[#EAB308] text-[#EAB308]"
                  : "border-[#2A2A2A] text-zinc-400 hover:text-white"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {filters.hideReversals && data.hiddenPairs > 0 && (
        <p className="mb-4 text-xs text-zinc-500">
          Hiding {data.hiddenPairs} reversal{data.hiddenPairs === 1 ? "" : "s"} along
          with the original purchase entr{data.hiddenPairs === 1 ? "y" : "ies"} they
          cancelled. The balance is unchanged.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Description</th>
              <th className="pb-3 pr-4 text-right">Debit</th>
              <th className="pb-3 pr-4 text-right">Credit</th>
              <th className="pb-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.openingBalance && (
              <tr className="border-b border-[#1C1C1C] text-zinc-400 italic">
                <td className="py-3 pr-4">
                  {new Date(filters.from + "T00:00:00Z").toLocaleDateString("en-KE")}
                </td>
                <td className="py-3 pr-4">Balance brought forward</td>
                <td className="py-3 pr-4" />
                <td className="py-3 pr-4" />
                <td className="py-3 text-right font-semibold text-zinc-300">
                  {fmt(data.openingBalance.toString())}
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr
                key={e.id}
                className="border-b border-[#1C1C1C] hover:bg-[#111]"
              >
                <td className="py-3 pr-4 text-zinc-400">
                  {new Date(e.date).toLocaleDateString("en-KE")}
                </td>
                <td className="py-3 pr-4 text-zinc-200">{e.description}</td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {Number(e.debit) > 0 ? fmt(e.debit.toString()) : "-"}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {Number(e.credit) > 0 ? fmt(e.credit.toString()) : "-"}
                </td>
                <td className="py-3 text-right font-semibold text-white">
                  {fmt(e.runningBalance.toString())}
                </td>
              </tr>
            ))}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="text-zinc-300">
                <td className="pt-3 pr-4 text-zinc-500" colSpan={2}>
                  {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                </td>
                <td className="pt-3 pr-4 text-right font-semibold">
                  {fmt(data.totalDebit.toString())}
                </td>
                <td className="pt-3 pr-4 text-right font-semibold">
                  {fmt(data.totalCredit.toString())}
                </td>
                <td className="pt-3 text-right font-semibold text-[#EAB308]">
                  {fmt(data.closingBalance.toString())}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {entries.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            {data.isFiltered ? "No entries match these filters." : "No ledger entries found."}
          </p>
        )}
      </div>
    </div>
  );
}
