import { getSalesBetween, getReportSummary } from "@/lib/queries";
import Decimal from "decimal.js";
import ReportsFilter from "./ReportsFilter";
import { DailyBreakdown, type DayRow } from "./DailyBreakdown";

const fmt = (n: Decimal | number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const defaults = defaultDateRange();
  const fromStr = params.from ?? defaults.from;
  const toStr = params.to ?? defaults.to;
  const today = new Date().toISOString().slice(0, 10);

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const [report, summary] = await Promise.all([
    getSalesBetween(from, to),
    getReportSummary(from, to),
  ]);

  const pdfUrl = `/api/pdf/report?from=${fromStr}&to=${toStr}`;

  const dayRows: DayRow[] = report.days.map((d) => ({
    date: d.date,
    salesCount: d.salesCount,
    cash: Number(d.cash),
    mpesa: Number(d.mpesa),
    debt: Number(d.debt),
    revenue: Number(d.revenue),
    grossProfit: Number(d.grossProfit),
    saleGroups: d.saleGroups.map((s) => ({
      saleId: s.saleId,
      customerName: s.customerName,
      channels: s.channels,
      total: Number(s.total),
      salesValue: Number(s.salesValue),
      cogs: Number(s.cogs),
      grossProfit: Number(s.grossProfit),
      lines: s.lines.map((line) => ({
        variantLabel: line.variantLabel,
        qty: line.qty,
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
        unitCost: Number(line.unitCost),
        grossProfit: Number(line.grossProfit),
      })),
    })),
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        <a
          href={pdfUrl}
          target="_blank"
          className="bg-[#4B0082] hover:bg-[#3a006b] text-white font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          ↓ Download PDF
        </a>
      </div>

      <ReportsFilter fromStr={fromStr} toStr={toStr} today={today} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-[#EAB308]">{fmt(report.totalRevenue)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Gross Profit</p>
          <p className="text-xl font-bold text-green-400">{fmt(report.totalGrossProfit)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Cash</p>
          <p className="text-xl font-bold text-white">{fmt(report.totalCash)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">M-Pesa</p>
          <p className="text-xl font-bold text-white">{fmt(report.totalMpesa)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Stock Value (WAC)</p>
          <p className="text-xl font-bold text-zinc-200">{fmt(summary.stockValueAtWac)}</p>
        </div>
      </div>

      {/* Channel split */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Debt Issued</p>
          <p className="text-lg font-semibold text-zinc-300">{fmt(report.totalDebt)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Sales</p>
          <p className="text-lg font-semibold text-zinc-300">{summary.salesCount}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Purchases</p>
          <p className="text-lg font-semibold text-zinc-300">{summary.purchasesCount}</p>
        </div>
      </div>

      {/* Daily breakdown */}
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Daily Breakdown
      </h3>
      <p className="text-xs text-zinc-500 mb-3">
        Click any day for its full sale-by-sale breakdown.
      </p>
      <DailyBreakdown days={dayRows} />
    </div>
  );
}
