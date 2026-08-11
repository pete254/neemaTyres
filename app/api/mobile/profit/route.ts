import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getProfitBreakdown } from "@/lib/queries";

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
  const size = searchParams.get("size") ?? undefined;
  const type = searchParams.get("type") ?? undefined;

  const data = await getProfitBreakdown(
    new Date(from + "T00:00:00Z"),
    new Date(to + "T23:59:59Z"),
    { size: size || undefined, brand: type || undefined }
  );
  return ok(data);
}
