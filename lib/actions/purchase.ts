"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postPurchase } from "@/lib/posting";

export async function createPurchase(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const supplierId = formData.get("supplierId") as string | null;
  const terms = formData.get("terms") as any;
  const date = new Date(formData.get("date") as string);
  const linesRaw = JSON.parse(formData.get("lines") as string);

  const lines = linesRaw.map((l: any) => ({
    variantId: l.variantId,
    qty: Number(l.qty),
    unitCost: new Decimal(l.unitCost),
  }));

  await postPurchase({
    supplierId: supplierId || undefined,
    date,
    terms,
    recordedById: session.user.id,
    lines,
  });

  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  redirect("/purchases/new?success=1");
}
