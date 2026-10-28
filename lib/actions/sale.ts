"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postSale, deleteSale, replaceSale } from "@/lib/posting";
import { upsertCustomerByName } from "@/lib/domain/customer";
import { logAction } from "@/lib/audit";
import { saleSnapshot, describeSaleCreated, describeSaleEdited, describeSaleDeleted } from "@/lib/auditDetail";

export async function createSale(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const linesRaw = JSON.parse(formData.get("lines") as string);
  const paymentsRaw = JSON.parse(formData.get("payments") as string);
  let customerId = (formData.get("customerId") as string) || null;
  const walkinName = (formData.get("walkinName") as string)?.trim() || null;
  const walkinPhone = (formData.get("walkinPhone") as string)?.trim() || null;
  const date = new Date(formData.get("date") as string);

  if (!customerId && walkinName) {
    customerId = await upsertCustomerByName(walkinName, walkinPhone, session.user.id);
  }

  const lines = linesRaw.map((l: { variantId: string; qty: string; unitPrice: string }) => ({
    variantId: l.variantId,
    qty: Number(l.qty),
    unitPrice: new Decimal(l.unitPrice),
  }));
  const payments = paymentsRaw.map((p: { channel: string; amount: string }) => ({
    channel: p.channel as "CASH" | "MPESA" | "DEBT",
    amount: new Decimal(p.amount),
  }));

  const sale = await postSale({
    customerId: customerId || undefined,
    date,
    recordedById: session.user.id,
    lines,
    payments,
  });

  const snap = await saleSnapshot(sale.id);
  await logAction(session.user.id, "CREATE_SALE", "Sale", sale.id, describeSaleCreated(snap), { sale: snap });

  revalidatePath("/inventory");
  revalidatePath("/debtors");
  revalidatePath("/customers");
  redirect("/sales/new?success=1");
}

export async function updateSale(saleId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const linesRaw = JSON.parse(formData.get("lines") as string);
  const paymentsRaw = JSON.parse(formData.get("payments") as string);
  let customerId = (formData.get("customerId") as string) || null;
  const walkinName = (formData.get("walkinName") as string)?.trim() || null;
  const walkinPhone = (formData.get("walkinPhone") as string)?.trim() || null;
  const date = new Date(formData.get("date") as string);

  if (!customerId && walkinName) {
    customerId = await upsertCustomerByName(walkinName, walkinPhone, session.user.id);
  }

  const lines = linesRaw.map((l: { variantId: string; qty: string; unitPrice: string }) => ({
    variantId: l.variantId,
    qty: Number(l.qty),
    unitPrice: new Decimal(l.unitPrice),
  }));
  const payments = paymentsRaw.map((p: { channel: string; amount: string }) => ({
    channel: p.channel as "CASH" | "MPESA" | "DEBT",
    amount: new Decimal(p.amount),
  }));

  const before = await saleSnapshot(saleId);
  // Delete + re-post in one transaction: a failed edit leaves the original sale intact.
  const updated = await replaceSale(saleId, {
    customerId: customerId || undefined,
    date,
    recordedById: session.user.id,
    lines,
    payments,
  });

  const after = await saleSnapshot(updated.id);
  await logAction(session.user.id, "UPDATE_SALE", "Sale", updated.id,
    describeSaleEdited(before, after), { previousSaleId: saleId, before, after });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/debtors");
  revalidatePath("/customers");
  redirect("/sales");
}

export async function deleteSaleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const saleId = formData.get("saleId") as string;
  if (!saleId) throw new Error("saleId required");

  const snap = await saleSnapshot(saleId);
  await deleteSale(saleId);
  await logAction(session.user.id, "DELETE_SALE", "Sale", saleId, describeSaleDeleted(snap), { sale: snap });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/debtors");
  revalidatePath("/customers");
}
