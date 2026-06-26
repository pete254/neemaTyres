"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postReturn } from "@/lib/posting";

export async function createReturn(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await postReturn({
    type: formData.get("type") as any,
    originalSaleLineId:
      (formData.get("originalSaleLineId") as string) || undefined,
    originalPurchaseLineId:
      (formData.get("originalPurchaseLineId") as string) || undefined,
    variantId: formData.get("variantId") as string,
    qty: Number(formData.get("qty")),
    unitValue: new Decimal(formData.get("unitValue") as string),
    date: new Date(formData.get("date") as string),
    note: (formData.get("note") as string) || undefined,
    recordedById: session.user.id,
  });

  revalidatePath("/inventory");
  redirect("/returns/new?success=1");
}
