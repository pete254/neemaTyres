import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getSalesBetween, getReportSummary } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;

  const fromDate = new Date(from + "T00:00:00Z");
  const toDate = new Date(to + "T23:59:59Z");

  const [sales, summary] = await Promise.all([
    getSalesBetween(fromDate, toDate),
    getReportSummary(fromDate, toDate),
  ]);

  return ok({ sales, summary });
}
