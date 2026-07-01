import { NextRequest } from "next/server";
import Decimal from "decimal.js";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getSalesBetween } from "@/lib/queries";
import { postSale } from "@/lib/posting";
import { upsertCustomerByName } from "@/lib/domain/customer";
import type { PaymentChannel } from "@/lib/posting/types";

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

  const data = await getSalesBetween(
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
      customerId?: string;
      walkinName?: string;
      walkinPhone?: string;
      lines: Array<{ variantId: string; qty: number; unitPrice: string | number }>;
      payments: Array<{ channel: string; amount: string | number }>;
    };

    let customerId = body.customerId;
    if (!customerId && body.walkinName) {
      customerId = await upsertCustomerByName(
        body.walkinName,
        body.walkinPhone ?? null,
        userId
      );
    }

    const result = await postSale({
      customerId,
      date: new Date(body.date + "T00:00:00Z"),
      recordedById: userId,
      lines: body.lines.map((l) => ({
        variantId: l.variantId,
        qty: l.qty,
        unitPrice: new Decimal(l.unitPrice),
      })),
      payments: body.payments.map((p) => ({
        channel: p.channel as PaymentChannel,
        amount: new Decimal(p.amount),
      })),
    });

    return Response.json({ success: true, saleId: result.id });
  } catch (err) {
    console.error("[mobile/sales POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
