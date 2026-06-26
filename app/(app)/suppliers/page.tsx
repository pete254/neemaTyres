import Link from "next/link";
import { getSuppliers } from "@/lib/queries";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Suppliers</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Supplier</th>
              <th className="pb-3 pr-4 text-right">Opening Balance</th>
              <th className="pb-3 text-right">Statement</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr
                key={s.id}
                className="border-b border-[#1C1C1C] hover:bg-[#111]"
              >
                <td className="py-3 pr-4 text-white font-medium">{s.name}</td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {fmt(s.openingBalance.toString())}
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/suppliers/${s.id}`}
                    className="text-[#EAB308] hover:underline text-xs"
                  >
                    View Statement
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            No suppliers found.
          </p>
        )}
      </div>
    </div>
  );
}
