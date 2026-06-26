import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

const fmt = (n: number | Decimal) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

async function getDashboardData() {
  const [inventory, customers, exceptions] = await Promise.all([
    prisma.productVariant.findMany({
      select: { qtyOnHand: true, wacCost: true },
    }),
    prisma.customer.findMany({
      include: {
        sales: {
          include: { payments: { where: { channel: "DEBT" } } },
        },
        debtCollections: true,
      },
    }),
    prisma.exceptionFlag.count({ where: { resolved: false } }),
  ]);

  const stockValue = inventory.reduce(
    (sum, v) =>
      sum.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );

  const debtorData = customers
    .map((c) => {
      const totalDebt = c.sales
        .flatMap((s) => s.payments)
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
      const totalCollected = c.debtCollections.reduce(
        (sum, dc) => sum.plus(dc.amount.toString()),
        new Decimal(0)
      );
      return totalDebt.minus(totalCollected);
    })
    .filter((o) => o.gt(0));

  const activeDebtors = debtorData.length;
  const totalOwed = debtorData.reduce(
    (sum, o) => sum.plus(o),
    new Decimal(0)
  );

  return { stockValue, activeDebtors, totalOwed, exceptions };
}

export default async function DashboardPage() {
  const { stockValue, activeDebtors, totalOwed, exceptions } =
    await getDashboardData();

  const stats = [
    {
      label: "Stock Value (WAC)",
      value: fmt(stockValue),
      color: "text-[#EAB308]",
    },
    {
      label: "Active Debtors",
      value: String(activeDebtors),
      color: "text-white",
    },
    {
      label: "Total Owed",
      value: fmt(totalOwed),
      color: "text-red-400",
    },
    {
      label: "Unresolved Flags",
      value: String(exceptions),
      color: exceptions > 0 ? "text-orange-400" : "text-green-400",
    },
  ];

  const quickLinks = [
    { href: "/sales/new", label: "Record Sale" },
    { href: "/purchases/new", label: "Record Purchase" },
    { href: "/debt-collections/new", label: "Collect Debt" },
    { href: "/supplier-payments/new", label: "Pay Supplier" },
    { href: "/returns/new", label: "Process Return" },
    { href: "/exceptions", label: "Review Flags" },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4"
          >
            <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4 text-sm font-medium text-zinc-300 hover:border-[#EAB308] hover:text-[#EAB308] transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
