import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { deleteSale, postSale } from "@/lib/posting";
import { getSaleById } from "@/lib/queries/saleById";
import { upsertCustomerByName } from "@/lib/domain/customer";
import { logAction } from "@/lib/audit";
import Decimal from "decimal.js";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try { ({ userId } = await verifyMobileToken(req)); } catch { return unauthorized(); }

  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) return Response.json({ error: "Not found" }, { status: 404 });

  return ok({
    id: sale.id,
    date: sale.date.toISOString().slice(0, 10),
    customerId: sale.customer?.id ?? null,
    customerName: sale.customer?.name ?? null,
    lines: sale.lines.map((l) => ({
      variantId: l.variantId,
      variantLabel: `${l.variant.sizeCanonical} ${l.variant.brand.name}`,
      qty: l.qty,
      unitPrice: l.unitPrice.toString(),
      lineTotal: l.lineTotal.toString(),
    })),
    payments: sale.payments.map((p) => ({
      channel: p.channel,
      amount: p.amount.toString(),
    })),
    total: sale.totalAmount.toString(),
    recordedBy: sale.recordedBy?.name ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try { ({ userId } = await verifyMobileToken(req)); } catch { return unauthorized(); }

  const { id } = await params;
  const body = await req.json();

  let customerId: string | undefined = body.customerId || undefined;
  const walkinName = (body.walkinName as string)?.trim() || null;
  if (!customerId && walkinName) {
    customerId = await upsertCustomerByName(walkinName, null, userId);
  }

  await deleteSale(id);

  const updated = await postSale({
    customerId,
    date: new Date(body.date + "T00:00:00Z"),
    recordedById: userId,
    lines: (body.lines as Array<{ variantId: string; qty: number; unitPrice: string }>).map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      unitPrice: new Decimal(l.unitPrice),
    })),
    payments: (body.payments as Array<{ channel: string; amount: string }>).map((p) => ({
      channel: p.channel as "CASH" | "MPESA" | "DEBT",
      amount: new Decimal(p.amount),
    })),
  });

  await logAction(userId, "UPDATE_SALE", "Sale", updated.id,
    `Sale edited via mobile — ${body.lines.length} line(s)`,
    { previousSaleId: id, source: "mobile" });

  return ok({ id: updated.id });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try { ({ userId } = await verifyMobileToken(req)); } catch { return unauthorized(); }

  const { id } = await params;
  try {
    await deleteSale(id);
    await logAction(userId, "DELETE_SALE", "Sale", id, `Sale deleted via mobile`, { source: "mobile" });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
