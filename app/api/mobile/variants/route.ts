import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getVariants } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function deriveSizeBucket(canonical: string): string {
  const m = canonical.match(/[Rr](\d+\.?\d*)$/);
  return m ? m[1] : canonical.replace(/[^0-9.]/g, "").slice(0, 4);
}

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const data = await getVariants();
  return ok(data);
}

export async function POST(req: NextRequest) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

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

  const sizeInput = (body.sizeBucket as string | undefined)?.trim();
  const sizeBucket = sizeInput || deriveSizeBucket(sizeCanonical);

  const variant = await prisma.productVariant.create({
    data: {
      sizeCanonical,
      sizeBucket,
      position: position as any,
      subLabel: body.subLabel?.trim() || null,
      patternCode: body.patternCode?.trim() || null,
      referenceSellPrice: body.referenceSellPrice || null,
      brandId: brand.id,
      recordedById: body._userId,
    },
  });
  return ok(variant);
}
