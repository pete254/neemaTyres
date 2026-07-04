"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAction } from "@/lib/audit";

function deriveSizeBucket(canonical: string): string {
  const m = canonical.match(/[Rr](\d+\.?\d*)$/);
  return m ? m[1] : canonical.replace(/[^0-9.]/g, "").slice(0, 4);
}

export async function createVariant(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const brandName = (formData.get("brandName") as string).trim();
  const sizeCanonical = (formData.get("sizeCanonical") as string).trim();
  const position = formData.get("position") as string;
  const subLabel = (formData.get("subLabel") as string).trim() || null;
  const patternCode = (formData.get("patternCode") as string).trim() || null;
  const refSell = (formData.get("referenceSellPrice") as string).trim();
  const sizeInput = (formData.get("sizeBucket") as string | null)?.trim();

  const sizeBucket = sizeInput || deriveSizeBucket(sizeCanonical);

  const brand = await prisma.brand.upsert({
    where: { name: brandName },
    create: { name: brandName },
    update: {},
  });

  const variant = await prisma.productVariant.create({
    data: {
      sizeCanonical,
      sizeBucket,
      position: position as any,
      subLabel,
      patternCode,
      referenceSellPrice: refSell ? refSell : null,
      brandId: brand.id,
      recordedById: session.user.id,
    },
  });

  await logAction(session.user.id, "CREATE_VARIANT", "ProductVariant", variant.id,
    `Created ${sizeCanonical} ${brandName} [${position}]`);

  revalidatePath("/inventory");
  revalidatePath("/purchases/new");
  redirect("/inventory");
}

export async function updateVariant(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const brandName = (formData.get("brandName") as string).trim();
  const sizeCanonical = (formData.get("sizeCanonical") as string).trim();
  const position = formData.get("position") as string;
  const subLabel = (formData.get("subLabel") as string).trim() || null;
  const patternCode = (formData.get("patternCode") as string).trim() || null;
  const refSell = (formData.get("referenceSellPrice") as string).trim();
  const sizeInput = (formData.get("sizeBucket") as string | null)?.trim();

  const sizeBucket = sizeInput || deriveSizeBucket(sizeCanonical);

  const brand = await prisma.brand.upsert({
    where: { name: brandName },
    create: { name: brandName },
    update: {},
  });

  const variant = await prisma.productVariant.update({
    where: { id },
    data: {
      sizeCanonical,
      sizeBucket,
      position: position as any,
      subLabel,
      patternCode,
      referenceSellPrice: refSell ? refSell : null,
      brandId: brand.id,
    },
  });

  await logAction(session.user.id, "UPDATE_VARIANT", "ProductVariant", variant.id,
    `Updated ${sizeCanonical} ${brandName} [${position}]`);

  revalidatePath("/inventory");
  revalidatePath("/purchases/new");
  redirect("/inventory");
}
