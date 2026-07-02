import { NextRequest } from "next/server";
import Decimal from "decimal.js";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { postDebtCollection } from "@/lib/posting";
import type { CollectionChannel } from "@/lib/posting/types";
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
      customerId: string;
      amount: string | number;
      channel: string;
      date: string;
      note?: string;
    };

    const amt = new Decimal(body.amount);
    const col = await postDebtCollection({
      customerId: body.customerId,
      amount: amt,
      channel: body.channel as CollectionChannel,
      date: new Date(body.date + "T00:00:00Z"),
      note: body.note,
      recordedById: userId,
    });

    await logAction(userId, "CREATE_DEBT_COLLECTION", "DebtCollection", col.id,
      `Debt collection KES ${amt.toFixed(2)} via ${col.channel}`,
      { customerId: body.customerId, amount: amt.toFixed(2), channel: col.channel });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[mobile/debt-collections POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
