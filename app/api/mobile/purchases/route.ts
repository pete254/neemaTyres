import { NextRequest } from "next/server";
import Decimal from "decimal.js";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getPurchasesBetween } from "@/lib/queries";
import { postPurchase } from "@/lib/posting";
import type { PurchaseTerms } from "@/lib/posting/types";
import { logAction } from "@/lib/audit";

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

  const data = await getPurchasesBetween(
    new Date(from + "T00:00:00Z"),
    new Date(to + "T23:59:59Z")
  );
  return ok(data);
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ userId } = await verifyMobileToken(req));
  } catch {
    return unauthorized();
  }

  try {
    const body = (await req.json()) as {
      date: string;
      supplierId?: string;
      terms: string;
      lines: Array<{ variantId: string; qty: number; unitCost: string | number }>;
    };

    const result = await postPurchase({
      supplierId: body.supplierId,
      date: new Date(body.date + "T00:00:00Z"),
      terms: body.terms as PurchaseTerms,
      recordedById: userId,
      lines: body.lines.map((l) => ({
        variantId: l.variantId,
        qty: l.qty,
        unitCost: new Decimal(l.unitCost),
      })),
    });

    await logAction(userId, "CREATE_PURCHASE", "Purchase", result.id,
      `Purchase of ${body.lines.length} line(s), terms ${body.terms}`,
      { terms: body.terms, lineCount: body.lines.length, source: "mobile" });

    return Response.json({ success: true, purchaseId: result.id });
  } catch (err) {
    console.error("[mobile/purchases POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
