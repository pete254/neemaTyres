"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAction } from "@/lib/audit";
import { describeVariantEdited, variantSnapshot } from "@/lib/auditDetail";

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

  const before = await variantSnapshot(id);
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

  const after = await variantSnapshot(id);
  await logAction(session.user.id, "UPDATE_VARIANT", "ProductVariant", variant.id,
    describeVariantEdited(before, after), { before, after });

  revalidatePath("/inventory");
  revalidatePath("/purchases/new");
  redirect("/inventory");
}

export async function deleteVariant(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const variant = await prisma.productVariant.findUniqueOrThrow({
    where: { id },
    include: {
      brand: true,
      saleLines: { take: 1, select: { id: true } },
      purchaseLines: { take: 1, select: { id: true } },
      returns: { take: 1, select: { id: true } },
      openingBalanceEntries: { take: 1, select: { id: true } },
    },
  });

  const hasHistory =
    variant.saleLines.length > 0 ||
    variant.purchaseLines.length > 0 ||
    variant.returns.length > 0 ||
    variant.openingBalanceEntries.length > 0;

  if (hasHistory) {
    redirect(`/variants/${id}/edit?deleteError=1`);
  }

  await prisma.productVariant.delete({ where: { id } });

  await logAction(session.user.id, "DELETE_VARIANT", "ProductVariant", id,
    `Deleted ${variant.sizeCanonical} ${variant.brand.name} [${variant.position}]`);

  revalidatePath("/inventory");
  redirect("/inventory");
}
