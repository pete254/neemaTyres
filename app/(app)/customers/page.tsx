import Link from "next/link";
import { getRankedCustomers } from "@/lib/queries/customerProfile";
import Decimal from "decimal.js";
import CustomerRankTable from "./CustomerRankTable";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const { sort = "spent", q = "" } = await searchParams;
  const raw = await getRankedCustomers();

  const filtered = q
    ? raw.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.phone ?? "").includes(q)
      )
    : raw;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "visits") return b.visitCount - a.visitCount;
    if (sort === "debt") return b.outstandingDebt.comparedTo(a.outstandingDebt);
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "recent") {
      return (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0);
    }
    return b.totalSpent.comparedTo(a.totalSpent);
  });

  // Serialise Decimal/Date to plain JS before passing to the client component
  const rows = sorted.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    totalSpent: Number(c.totalSpent),
    visitCount: c.visitCount,
    outstandingDebt: Number(c.outstandingDebt),
    lastVisit: c.lastVisit ? c.lastVisit.toISOString() : null,
  }));

  const totalSpent = raw.reduce((s, c) => s.plus(c.totalSpent), new Decimal(0));
  const totalDebt = raw.reduce(
    (s, c) => (c.outstandingDebt.gt(0) ? s.plus(c.outstandingDebt) : s),
    new Decimal(0)
  );
  const withDebt = raw.filter((c) => c.outstandingDebt.gt(0)).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Customers</h2>
        <Link
          href="/customers/new"
          className="px-4 py-2 rounded-lg bg-[#EAB308] text-black text-sm font-semibold hover:bg-yellow-400 transition-colors"
        >
          + New Customer
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Customers</p>
          <p className="text-xl font-bold text-white">{raw.length}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(Number(totalSpent))}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Debtors</p>
          <p className="text-xl font-bold text-red-400">{withDebt}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Owed</p>
          <p className="text-xl font-bold text-red-400">{fmt(Number(totalDebt))}</p>
        </div>
      </div>

      <CustomerRankTable customers={rows} currentSort={sort} currentQ={q} />
    </div>
  );
}
