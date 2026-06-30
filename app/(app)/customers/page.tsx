import Link from "next/link";
import { getRankedCustomers } from "@/lib/queries/customerProfile";
import Decimal from "decimal.js";
import CustomerRankTable from "./CustomerRankTable";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
    Number(n)
  );

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const { sort = "spent", q = "" } = await searchParams;
  const customers = await getRankedCustomers();

  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.phone ?? "").includes(q)
      )
    : customers;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "visits") return b.visitCount - a.visitCount;
    if (sort === "debt") return b.outstandingDebt.comparedTo(a.outstandingDebt);
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "recent") {
      const at = a.lastVisit?.getTime() ?? 0;
      const bt = b.lastVisit?.getTime() ?? 0;
      return bt - at;
    }
    return b.totalSpent.comparedTo(a.totalSpent); // default: spent
  });

  const totals = {
    customers: customers.length,
    totalSpent: customers.reduce((s, c) => s.plus(c.totalSpent), new Decimal(0)),
    totalDebt: customers.reduce(
      (s, c) => (c.outstandingDebt.gt(0) ? s.plus(c.outstandingDebt) : s),
      new Decimal(0)
    ),
    withDebt: customers.filter((c) => c.outstandingDebt.gt(0)).length,
  };

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

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Customers</p>
          <p className="text-xl font-bold text-white">{totals.customers}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(totals.totalSpent)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Debtors</p>
          <p className="text-xl font-bold text-red-400">{totals.withDebt}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Owed</p>
          <p className="text-xl font-bold text-red-400">{fmt(totals.totalDebt)}</p>
        </div>
      </div>

      <CustomerRankTable customers={sorted} currentSort={sort} currentQ={q} />
    </div>
  );
}
