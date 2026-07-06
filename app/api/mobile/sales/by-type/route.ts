import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getStockableVariants, getVariantStockLedger } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const variantId = searchParams.get("variantId");

  if (variantId) {
    const ledger = await getVariantStockLedger(variantId);
    if (!ledger) {
      return Response.json({ error: "Tyre type not found" }, { status: 404 });
    }
    return ok(ledger);
  }

  const variants = await getStockableVariants();
  return ok({ variants });
}
