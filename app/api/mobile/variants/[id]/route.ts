import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";

function deriveSizeBucket(canonical: string): string {
  const m = canonical.match(/[Rr](\d+\.?\d*)$/);
  return m ? m[1] : canonical.replace(/[^0-9.]/g, "").slice(0, 4);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

  const { id } = await params;
  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: { brand: { select: { name: true } } },
  });
  if (!variant) return Response.json({ error: "Not found" }, { status: 404 });

  return ok({
    id: variant.id,
    brandName: variant.brand.name,
    sizeCanonical: variant.sizeCanonical,
    position: variant.position,
    subLabel: variant.subLabel,
    patternCode: variant.patternCode,
    referenceSellPrice: variant.referenceSellPrice?.toString() ?? null,
    qtyOnHand: variant.qtyOnHand,
    wacCost: variant.wacCost.toString(),
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

  const brandName = (body.brandName as string)?.trim();
  const sizeCanonical = (body.sizeCanonical as string)?.trim();
  const position = body.position as string;

  if (!brandName || !sizeCanonical || !position) {
    return Response.json({ error: "brandName, sizeCanonical and position are required" }, { status: 400 });
  }

  const brand = await prisma.brand.upsert({
    where: { name: brandName },
    create: { name: brandName },
    update: {},
  });

  const variant = await prisma.productVariant.update({
    where: { id },
    data: {
      sizeCanonical,
      sizeBucket: deriveSizeBucket(sizeCanonical),
      position: position as any,
      subLabel: body.subLabel?.trim() || null,
      patternCode: body.patternCode?.trim() || null,
      referenceSellPrice: body.referenceSellPrice?.trim() || null,
      brandId: brand.id,
    },
  });

  await logAction(userId, "UPDATE_VARIANT", "ProductVariant", variant.id,
    `Updated ${sizeCanonical} ${brandName} [${position}] via mobile`,
    { source: "mobile" });

  return ok(variant);
}
