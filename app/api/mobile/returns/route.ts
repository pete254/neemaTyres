import { NextRequest } from "next/server";
import Decimal from "decimal.js";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { postReturn } from "@/lib/posting";
import type { ReturnType } from "@/lib/posting/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ userId } = await verifyMobileToken(req));
  } catch {
    return unauthorized();
  }

  try {
    const body = (await req.json()) as {
      type: string;
      variantId: string;
      qty: number;
      unitValue: string | number;
      date: string;
      originalSaleLineId?: string;
      originalPurchaseLineId?: string;
      note?: string;
    };

    await postReturn({
      type: body.type as ReturnType,
      variantId: body.variantId,
      qty: body.qty,
      unitValue: new Decimal(body.unitValue),
      date: new Date(body.date + "T00:00:00Z"),
      originalSaleLineId: body.originalSaleLineId,
      originalPurchaseLineId: body.originalPurchaseLineId,
      note: body.note,
      recordedById: userId,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[mobile/returns POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
