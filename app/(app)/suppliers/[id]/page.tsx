import Link from "next/link";
import { getSupplierStatement } from "@/lib/queries";
import { notFound } from "next/navigation";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierStatementPage({ params }: PageProps) {
  const { id } = await params;

  let data;
  try {
    data = await getSupplierStatement(id);
  } catch {
    notFound();
  }

  const { supplier, entries } = data;
  const currentBalance =
    entries.length > 0
      ? entries[entries.length - 1].runningBalance.toString()
      : "0";

  return (
    <div className="p-6">
      <div className="mb-6">
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
