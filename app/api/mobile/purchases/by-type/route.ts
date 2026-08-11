import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getStockableVariants, getVariantPurchases } from "@/lib/queries";

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
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const from = fromStr ? new Date(fromStr + "T00:00:00Z") : undefined;
    const to = toStr ? new Date(toStr + "T23:59:59Z") : undefined;
    const purchases = await getVariantPurchases(variantId, from, to);
    if (!purchases) {
      return Response.json({ error: "Tyre type not found" }, { status: 404 });
    }
    return ok(purchases);
  }

  const variants = await getStockableVariants();
  return ok({ variants });
}
