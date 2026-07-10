import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import {
  ShoppingCart,
  PackagePlus,
  Wallet,
  Truck,
  RotateCcw,
  Flag,
  TrendingUp,
  TrendingDown,
  Boxes,
  Users,
  BadgeDollarSign,
  BarChart2,
} from "lucide-react";

const fmt = (n: number | Decimal) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

async function getDashboardData() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(todayStr + "T00:00:00Z");
  const todayEnd = new Date(todayStr + "T23:59:59Z");

  const [inventory, customers, todaySaleLines, todayPurchaseAgg] =
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
  const tyresInStore = inventory.reduce((sum, v) => sum + v.qtyOnHand, 0);

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
    tyresInStore,
    activeDebtors,
    totalOwed,
    todaySales,
    todayPurchases,
    todayProfit,
    todayStr,
  };
}

export default async function DashboardPage() {
  const {
    stockValue,
    tyresInStore,
    activeDebtors,
    totalOwed,
    todaySales,
    todayPurchases,
    todayProfit,
    todayStr,
  } = await getDashboardData();

  const cardBase = "bg-[#111] border border-[#2A2A2A] rounded-lg p-4 transition-colors";
  const cardLink = cardBase + " hover:border-[#EAB308] cursor-pointer";

  const quickLinks = [
    { href: "/sales/new",             label: "Record Sale",      icon: ShoppingCart },
    { href: "/purchases/new",         label: "Record Purchase",  icon: PackagePlus },
    { href: "/debt-collections/new",  label: "Collect Debt",     icon: Wallet },
    { href: "/supplier-payments/new", label: "Pay Supplier",     icon: Truck },
    { href: "/returns/new",           label: "Process Return",   icon: RotateCcw },
    { href: "/exceptions",            label: "Review Flags",     icon: Flag },
  ];

  const profitColor = todayProfit.gte(0) ? "text-green-400" : "text-red-400";
  const ProfitIcon = todayProfit.gte(0) ? TrendingUp : TrendingDown;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

      {/* Today */}
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Today &mdash; {todayStr}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href={`/sales?from=${todayStr}&to=${todayStr}`} className={cardLink}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Total Sales</p>
            <ShoppingCart size={16} className="text-[#EAB308] opacity-70" />
          </div>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(todaySales)}</p>
          <p className="text-xs text-zinc-600 mt-1">View transactions →</p>
        </Link>
        <Link href={`/purchases?from=${todayStr}&to=${todayStr}`} className={cardLink}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Purchases</p>
            <PackagePlus size={16} className="text-blue-400 opacity-70" />
          </div>
          <p className="text-xl font-bold text-blue-400">{fmt(todayPurchases)}</p>
          <p className="text-xs text-zinc-600 mt-1">View transactions →</p>
        </Link>
        <Link href={`/profit?from=${todayStr}&to=${todayStr}`} className={cardLink}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Gross Profit</p>
            <ProfitIcon size={16} className={`${profitColor} opacity-70`} />
          </div>
          <p className={`text-xl font-bold ${profitColor}`}>{fmt(todayProfit)}</p>
          <p className="text-xs text-zinc-600 mt-1">View breakdown →</p>
        </Link>
      </div>

      {/* Overview */}
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Overview
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Stock Value (WAC)</p>
            <BarChart2 size={16} className="text-[#EAB308] opacity-70" />
          </div>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(stockValue)}</p>
        </div>
        <Link href="/inventory" className={cardLink}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Tyres in Store</p>
            <Boxes size={16} className="text-green-400 opacity-70" />
          </div>
          <p className="text-xl font-bold text-green-400">{tyresInStore}</p>
          <p className="text-xs text-zinc-600 mt-1">View inventory →</p>
        </Link>
        <Link href="/debtors" className={cardLink}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Active Debtors</p>
            <Users size={16} className="text-white opacity-50" />
          </div>
          <p className="text-xl font-bold text-white">{activeDebtors}</p>
          <p className="text-xs text-zinc-600 mt-1">View list →</p>
        </Link>
        <Link href="/debtors" className={cardLink}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500">Total Owed</p>
            <BadgeDollarSign size={16} className="text-red-400 opacity-70" />
          </div>
          <p className="text-xl font-bold text-red-400">{fmt(totalOwed)}</p>
          <p className="text-xs text-zinc-600 mt-1">View list →</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 bg-[#111] border border-[#2A2A2A] rounded-lg p-4 text-sm font-medium text-zinc-300 hover:border-[#EAB308] hover:text-[#EAB308] transition-colors"
          >
            <Icon size={16} strokeWidth={1.75} className="flex-shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
