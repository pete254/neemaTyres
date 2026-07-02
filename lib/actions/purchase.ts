"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postPurchase, deletePurchase } from "@/lib/posting";
import { logAction } from "@/lib/audit";

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

  const purchase = await postPurchase({
    supplierId: supplierId || undefined,
    date,
    terms,
    recordedById: session.user.id,
    lines,
  });

  await logAction(session.user.id, "CREATE_PURCHASE", "Purchase", purchase.id,
    `Purchase of ${lines.length} line(s), terms ${terms}`,
    { terms, lineCount: lines.length });

  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  redirect("/purchases/new?success=1");
}

function parsePurchaseFormData(formData: FormData) {
  const supplierId = (formData.get("supplierId") as string) || null;
  const terms = formData.get("terms") as "CASH" | "CREDIT" | "FREE";
  const date = new Date(formData.get("date") as string);
  const linesRaw = JSON.parse(formData.get("lines") as string);
  const lines = linesRaw.map((l: any) => ({
    variantId: l.variantId,
    qty: Number(l.qty),
    unitCost: new Decimal(l.unitCost || "0"),
  }));
  return { supplierId, terms, date, lines };
}

export async function updatePurchase(purchaseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const { supplierId, terms, date, lines } = parsePurchaseFormData(formData);

  await deletePurchase(purchaseId);
  const updated = await postPurchase({ supplierId: supplierId || undefined, date, terms, recordedById: session.user.id, lines });

  await logAction(session.user.id, "UPDATE_PURCHASE", "Purchase", updated.id,
    `Purchase updated — ${lines.length} line(s), terms ${terms}`,
    { previousPurchaseId: purchaseId });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  redirect("/purchases");
}

export async function deletePurchaseAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const purchaseId = formData.get("purchaseId") as string;
  if (!purchaseId) throw new Error("purchaseId required");

  await deletePurchase(purchaseId);
  await logAction(session.user.id, "DELETE_PURCHASE", "Purchase", purchaseId,
    `Purchase ${purchaseId} deleted — WAC reversed`);

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
}
