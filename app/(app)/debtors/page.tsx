import Link from "next/link";
import { getDebtors } from "@/lib/queries";
import Decimal from "decimal.js";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

export default async function DebtorsPage() {
  const debtors = await getDebtors();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Debtors</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4 text-right">Outstanding</th>
              <th className="pb-3 pr-4 text-right">Oldest Unpaid</th>
              <th className="pb-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {debtors.map((d) => (
              <tr
                key={d.id}
                className="border-b border-[#1C1C1C] hover:bg-[#111]"
              >
                <td className="py-3 pr-4 font-medium">
                  <Link
                    href={`/debtors/${d.id}`}
                    className="text-white hover:text-[#EAB308] transition-colors"
                  >
                    {d.name}
                  </Link>
                  {d.phone && (
                    <span className="ml-2 text-xs text-zinc-500">
                      {d.phone}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-right font-semibold text-red-400">
                  {fmt(d.outstanding)}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-400">
                  {d.oldestUnpaid
                    ? new Date(d.oldestUnpaid).toLocaleDateString("en-KE")
                    : "-"}
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/debtors/${d.id}`}
                    className="text-xs text-zinc-500 hover:text-[#EAB308] transition-colors"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {debtors.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No debtors found.</p>
        )}
      </div>
    </div>
  );
}
