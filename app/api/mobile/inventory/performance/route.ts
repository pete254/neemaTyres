import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getStockPerformance, getStaleStock } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? today;
  const staleDays = Number(searchParams.get("stale") ?? "90");

  const [performance, stale] = await Promise.all([
    getStockPerformance(new Date(from + "T00:00:00Z"), new Date(to + "T23:59:59Z")),
    getStaleStock(Number.isFinite(staleDays) ? staleDays : 90),
  ]);

  return ok({ performance, stale });
}
