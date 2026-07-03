import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { postPurchase, deletePurchase } from "@/lib/posting";
import { logAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import type { PurchaseTerms } from "@/lib/posting/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: { include: { variant: { include: { brand: { select: { name: true } } } } } },
    },
  });
  if (!purchase) return Response.json({ error: "Not found" }, { status: 404 });

  return ok({
    id: purchase.id,
    date: purchase.date.toISOString().slice(0, 10),
    supplierId: purchase.supplierId ?? null,
    supplierName: purchase.supplier?.name ?? null,
    terms: purchase.terms,
    lines: purchase.lines.map((l) => ({
      variantId: l.variantId,
      variantLabel: `${l.variant.sizeCanonical} ${l.variant.brand.name}`,
      qty: l.qty,
      unitCost: l.unitCost.toString(),
    })),
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

  await deletePurchase(id);

  const updated = await postPurchase({
    supplierId: body.supplierId || undefined,
    date: new Date(body.date + "T00:00:00Z"),
    terms: body.terms as PurchaseTerms,
    recordedById: userId,
    lines: (body.lines as Array<{ variantId: string; qty: number; unitCost: string }>).map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      unitCost: new Decimal(l.unitCost || "0"),
    })),
  });

  await logAction(userId, "UPDATE_PURCHASE", "Purchase", updated.id,
    `Purchase edited via mobile — ${body.lines.length} line(s)`,
    { previousPurchaseId: id, source: "mobile" });

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
    await deletePurchase(id);
    await logAction(userId, "DELETE_PURCHASE", "Purchase", id, `Purchase deleted via mobile`, { source: "mobile" });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
