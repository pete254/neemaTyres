import { NextRequest } from "next/server";
import Decimal from "decimal.js";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { postSupplierPayment } from "@/lib/posting";
import { logAction } from "@/lib/audit";

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
      supplierId: string;
      amount: string | number;
      date: string;
      note?: string;
    };

    const amt = new Decimal(body.amount);
    const payment = await postSupplierPayment({
      supplierId: body.supplierId,
      amount: amt,
      date: new Date(body.date + "T00:00:00Z"),
      note: body.note,
      recordedById: userId,
    });

    await logAction(userId, "CREATE_SUPPLIER_PAYMENT", "SupplierPayment", payment.id,
      `Supplier payment KES ${amt.toFixed(2)}`,
      { supplierId: body.supplierId, amount: amt.toFixed(2), source: "mobile" });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[mobile/supplier-payments POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
