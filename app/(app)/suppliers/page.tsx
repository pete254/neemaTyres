import Link from "next/link";
import { getSuppliers } from "@/lib/queries";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(n));

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Suppliers</h2>
        <Link
          href="/suppliers/new"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + New Supplier
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Supplier</th>
              <th className="pb-3 pr-4">Phone</th>
              <th className="pb-3 pr-4">Town</th>
              <th className="pb-3 pr-4 text-right">Opening Balance</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-[#1C1C1C] hover:bg-[#111]">
                <td className="py-3 pr-4">
                  <p className="text-white font-medium">{s.name}</p>
                  {s.email && <p className="text-zinc-500 text-xs">{s.email}</p>}
                </td>
                <td className="py-3 pr-4 text-zinc-400">{s.phone ?? "—"}</td>
                <td className="py-3 pr-4 text-zinc-400">{s.town ?? "—"}</td>
                <td className="py-3 pr-4 text-right text-zinc-300">{fmt(s.openingBalance.toString())}</td>
                <td className="py-3 text-right space-x-3">
                  <Link href={`/suppliers/${s.id}/edit`} className="text-zinc-400 hover:text-white text-xs">
                    Edit
                  </Link>
                  <Link href={`/suppliers/${s.id}`} className="text-[#EAB308] hover:underline text-xs">
                    Statement
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No suppliers yet. <Link href="/suppliers/new" className="text-[#EAB308] hover:underline">Add one</Link></p>
        )}
      </div>
    </div>
  );
}
