import Link from "next/link";
import { getSupplierStatement, hideReversalPairs } from "@/lib/queries";
import { notFound } from "next/navigation";
import { SharePdfButton } from "@/components/SharePdfButton";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hideReversals?: string }>;
}

export default async function SupplierStatementPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const hideReversals = (await searchParams).hideReversals === "1";

  let data;
  try {
    data = await getSupplierStatement(id);
  } catch {
    notFound();
  }

  const { supplier } = data;
  const { entries, hiddenPairs } = hideReversals
    ? hideReversalPairs(data.entries)
    : { entries: data.entries, hiddenPairs: 0 };
  const reversalCount = data.entries.filter((e) =>
    e.description.startsWith("Reversal — ")
  ).length;

  const pdfQuery = hideReversals ? "?hideReversals=1" : "";
  const pdfUrl = `/api/pdf/supplier-statement/${id}${pdfQuery}`;
  const pdfFilename = `statement-${supplier.name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}.pdf`;
  const btnCls =
    "bg-[#4B0082] hover:bg-[#3a006b] disabled:opacity-60 text-white font-semibold rounded px-4 py-2 text-sm transition-colors";

  const currentBalance =
    entries.length > 0
      ? entries[entries.length - 1].runningBalance.toString()
      : "0";

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
              {fmt(currentBalance)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={hideReversals ? `/suppliers/${id}` : `/suppliers/${id}?hideReversals=1`}
            className="border border-[#2A2A2A] hover:border-[#EAB308] text-zinc-300 hover:text-white rounded px-4 py-2 text-sm transition-colors"
          >
            {hideReversals ? "Show reversals" : `Hide reversals${reversalCount ? ` (${reversalCount})` : ""}`}
          </Link>
          <a href={pdfUrl} target="_blank" className={btnCls}>
            View PDF
          </a>
          <a
            href={`${pdfUrl}${pdfQuery ? "&" : "?"}download=1`}
            className={btnCls}
          >
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

      {hideReversals && hiddenPairs > 0 && (
        <p className="mb-4 text-xs text-zinc-500">
          Hiding {hiddenPairs} reversal{hiddenPairs === 1 ? "" : "s"} along with the
          original purchase entr{hiddenPairs === 1 ? "y" : "ies"} they cancelled.
          The balance is unchanged.
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
        </table>
        {entries.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            No ledger entries found.
          </p>
        )}
      </div>
    </div>
  );
}
