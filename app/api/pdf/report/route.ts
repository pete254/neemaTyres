export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getSalesBetween, getReportSummary } from "@/lib/queries";
import { getShopInfo } from "@/lib/shopInfo";
import { ReportPDF } from "@/lib/pdf/ReportPDF";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const fromStr = searchParams.get("from") ?? today;
  const toStr = searchParams.get("to") ?? today;

  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T23:59:59Z");

  const [report, summary, shop] = await Promise.all([
    getSalesBetween(from, to),
    getReportSummary(from, to),
    getShopInfo(),
  ]);

  const data = {
    fromStr,
    toStr,
    totalRevenue: report.totalRevenue.toString(),
    totalCash: report.totalCash.toString(),
    totalMpesa: report.totalMpesa.toString(),
    totalDebt: report.totalDebt.toString(),
    stockValueAtWac: summary.stockValueAtWac.toString(),
    salesCount: summary.salesCount,
    purchasesCount: summary.purchasesCount,
    days: report.days.map((d) => ({
      date: d.date,
      salesCount: d.salesCount,
      cash: d.cash.toString(),
      mpesa: d.mpesa.toString(),
      debt: d.debt.toString(),
      revenue: d.revenue.toString(),
    })),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(ReportPDF, { data, shop }) as any);
  const shopSlug = shop.name ? shop.name.replace(/\s+/g, "-").toLowerCase() : "report";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${shopSlug}-sales-report-${fromStr}-to-${toStr}.pdf"`,
    },
  });
}
