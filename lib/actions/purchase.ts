"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postPurchase, deletePurchase } from "@/lib/posting";
import { logAction } from "@/lib/audit";
import {
  purchaseSnapshot, describePurchaseCreated, describePurchaseEdited, describePurchaseDeleted,
} from "@/lib/auditDetail";

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

  const snap = await purchaseSnapshot(purchase.id);
  await logAction(session.user.id, "CREATE_PURCHASE", "Purchase", purchase.id,
    describePurchaseCreated(snap), { purchase: snap });

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

  const before = await purchaseSnapshot(purchaseId);
  await deletePurchase(purchaseId);
  const updated = await postPurchase({ supplierId: supplierId || undefined, date, terms, recordedById: session.user.id, lines });

  const after = await purchaseSnapshot(updated.id);
  await logAction(session.user.id, "UPDATE_PURCHASE", "Purchase", updated.id,
    describePurchaseEdited(before, after), { previousPurchaseId: purchaseId, before, after });

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

  const snap = await purchaseSnapshot(purchaseId);
  await deletePurchase(purchaseId);
  await logAction(session.user.id, "DELETE_PURCHASE", "Purchase", purchaseId,
    describePurchaseDeleted(snap), { purchase: snap });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
}
