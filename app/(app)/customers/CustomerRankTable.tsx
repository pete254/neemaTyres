"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  totalSpent: number;
  visitCount: number;
  outstandingDebt: number;
  lastVisit: string | null; // ISO string
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);

const SortLink = ({
  field,
  label,
  current,
  q,
}: {
  field: string;
  label: string;
  current: string;
  q: string;
}) => {
  const active = current === field;
  const params = new URLSearchParams({ sort: field, ...(q ? { q } : {}) });
  return (
    <Link
      href={`/customers?${params}`}
      className={`text-xs font-semibold transition-colors ${
        active ? "text-[#EAB308]" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label} {active ? "▼" : ""}
    </Link>
  );
};

export default function CustomerRankTable({
  customers,
  currentSort,
  currentQ,
}: {
  customers: CustomerRow[];
  currentSort: string;
  currentQ: string;
}) {
  const router = useRouter();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const params = new URLSearchParams({ sort: currentSort, ...(val ? { q: val } : {}) });
    router.replace(`/customers?${params}`);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          defaultValue={currentQ}
          onChange={handleSearch}
          placeholder="Search name or phone…"
          className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-1.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#EAB308] w-64"
        />
        <span className="text-xs text-zinc-500">Sort by:</span>
        <SortLink field="spent" label="Revenue" current={currentSort} q={currentQ} />
        <SortLink field="visits" label="Visits" current={currentSort} q={currentQ} />
        <SortLink field="debt" label="Debt" current={currentSort} q={currentQ} />
        <SortLink field="recent" label="Recent" current={currentSort} q={currentQ} />
        <SortLink field="name" label="Name" current={currentSort} q={currentQ} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4 text-right">Total Spent</th>
              <th className="pb-3 pr-4 text-right">Visits</th>
              <th className="pb-3 pr-4 text-right">Outstanding</th>
              <th className="pb-3 pr-4 text-right">Last Visit</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, idx) => (
              <tr key={c.id} className="border-b border-[#1C1C1C] hover:bg-[#111]">
                <td className="py-3 pr-4 text-zinc-600 text-xs">{idx + 1}</td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-medium text-white hover:text-[#EAB308] transition-colors"
                  >
                    {c.name}
                  </Link>
                  {c.phone && (
                    <span className="ml-2 text-xs text-zinc-500">{c.phone}</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-right font-semibold text-[#EAB308]">
                  {c.totalSpent > 0 ? fmt(c.totalSpent) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-300">{c.visitCount}</td>
                <td className="py-3 pr-4 text-right">
                  {c.outstandingDebt > 0 ? (
                    <span className="text-red-400 font-semibold">{fmt(c.outstandingDebt)}</span>
                  ) : (
                    <span className="text-green-500 text-xs">Clear</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-500 text-xs">
                  {c.lastVisit
                    ? new Date(c.lastVisit).toLocaleDateString("en-KE")
                    : "—"}
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-xs text-zinc-500 hover:text-[#EAB308] transition-colors"
                  >
                    Profile →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No customers found.</p>
        )}
      </div>
    </div>
  );
}
