import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

const fmt = (n: number | Decimal) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

async function getDashboardData() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(todayStr + "T00:00:00Z");
  const todayEnd = new Date(todayStr + "T23:59:59Z");

  const [inventory, customers, exceptions, todaySaleLines, todayPurchaseAgg] =
    await Promise.all([
      prisma.productVariant.findMany({
        select: { qtyOnHand: true, wacCost: true },
      }),
      prisma.customer.findMany({
        include: {
          openingBalanceEntries: { where: { kind: "DEBTOR" } },
          sales: {
            include: { payments: { where: { channel: "DEBT" } } },
          },
          debtCollections: true,
        },
      }),
      prisma.exceptionFlag.count({ where: { resolved: false } }),
      prisma.saleLine.findMany({
        where: { sale: { date: { gte: todayStart, lte: todayEnd } } },
        select: { qty: true, unitCostAtSale: true, lineTotal: true },
      }),
      prisma.purchaseLine.aggregate({
        where: { purchase: { date: { gte: todayStart, lte: todayEnd } } },
        _sum: { lineTotal: true },
      }),
    ]);

  const stockValue = inventory.reduce(
    (sum, v) =>
      sum.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );

  const debtorData = customers
    .map((c) => {
      const openingDebt = c.openingBalanceEntries.reduce(
        (sum, e) => sum.plus(e.amount?.toString() ?? "0"),
        new Decimal(0)
      );
      const saleDebt = c.sales
        .flatMap((s) => s.payments)
        .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0));
      const totalCollected = c.debtCollections.reduce(
        (sum, dc) => sum.plus(dc.amount.toString()),
        new Decimal(0)
      );
      return openingDebt.plus(saleDebt).minus(totalCollected);
    })
    .filter((o) => o.gt(0));

  const activeDebtors = debtorData.length;
  const totalOwed = debtorData.reduce(
    (sum, o) => sum.plus(o),
    new Decimal(0)
  );

  const todaySales = todaySaleLines.reduce(
    (sum, l) => sum.plus(l.lineTotal.toString()),
    new Decimal(0)
  );
  const todayCOGS = todaySaleLines.reduce(
    (sum, l) =>
      sum.plus(new Decimal(l.unitCostAtSale.toString()).mul(l.qty)),
    new Decimal(0)
  );
  const todayProfit = todaySales.minus(todayCOGS);
  const todayPurchases = new Decimal(
    (todayPurchaseAgg._sum.lineTotal ?? 0).toString()
  );

  return {
    stockValue,
    activeDebtors,
    totalOwed,
    exceptions,
    todaySales,
    todayPurchases,
    todayProfit,
    todayStr,
  };
}

export default async function DashboardPage() {
  const {
    stockValue,
    activeDebtors,
    totalOwed,
    exceptions,
    todaySales,
    todayPurchases,
    todayProfit,
    todayStr,
  } = await getDashboardData();

  const cardBase =
    "bg-[#111] border border-[#2A2A2A] rounded-lg p-4 transition-colors";
  const cardLink = cardBase + " hover:border-[#EAB308] cursor-pointer";

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

      {/* Today */}
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Today &mdash; {todayStr}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href={`/sales?from=${todayStr}&to=${todayStr}`}
          className={cardLink}
        >
          <p className="text-xs text-zinc-500 mb-1">Total Sales</p>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(todaySales)}</p>
          <p className="text-xs text-zinc-600 mt-1">View transactions →</p>
        </Link>
        <Link
          href={`/purchases?from=${todayStr}&to=${todayStr}`}
          className={cardLink}
        >
          <p className="text-xs text-zinc-500 mb-1">Purchases</p>
          <p className="text-xl font-bold text-blue-400">
            {fmt(todayPurchases)}
          </p>
          <p className="text-xs text-zinc-600 mt-1">View transactions →</p>
        </Link>
        <div className={cardBase}>
          <p className="text-xs text-zinc-500 mb-1">Gross Profit</p>
          <p
            className={`text-xl font-bold ${
              todayProfit.gte(0) ? "text-green-400" : "text-red-400"
            }`}
          >
            {fmt(todayProfit)}
          </p>
        </div>
      </div>

      {/* Overview */}
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Overview
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={cardBase}>
          <p className="text-xs text-zinc-500 mb-1">Stock Value (WAC)</p>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(stockValue)}</p>
        </div>
        <Link href="/debtors" className={cardLink}>
          <p className="text-xs text-zinc-500 mb-1">Active Debtors</p>
          <p className="text-xl font-bold text-white">{activeDebtors}</p>
          <p className="text-xs text-zinc-600 mt-1">View list →</p>
        </Link>
        <Link href="/debtors" className={cardLink}>
          <p className="text-xs text-zinc-500 mb-1">Total Owed</p>
          <p className="text-xl font-bold text-red-400">{fmt(totalOwed)}</p>
          <p className="text-xs text-zinc-600 mt-1">View list →</p>
        </Link>
        <Link
          href="/exceptions"
          className={
            cardBase +
            ` hover:border-${exceptions > 0 ? "orange" : "zinc"}-400 cursor-pointer`
          }
        >
          <p className="text-xs text-zinc-500 mb-1">Unresolved Flags</p>
          <p
            className={`text-xl font-bold ${
              exceptions > 0 ? "text-orange-400" : "text-green-400"
            }`}
          >
            {exceptions}
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
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
