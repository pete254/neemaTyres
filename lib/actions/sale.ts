"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postSale, deleteSale } from "@/lib/posting";
import { upsertCustomerByName } from "@/lib/domain/customer";
import { logAction } from "@/lib/audit";

export async function createSale(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const linesRaw = JSON.parse(formData.get("lines") as string);
  const paymentsRaw = JSON.parse(formData.get("payments") as string);
  let customerId = (formData.get("customerId") as string) || null;
  const walkinName = (formData.get("walkinName") as string)?.trim() || null;
  const walkinPhone = (formData.get("walkinPhone") as string)?.trim() || null;
  const date = new Date(formData.get("date") as string);

  // If a walk-in name was provided, upsert a customer record
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

  await logAction(session.user.id, "CREATE_SALE", "Sale", sale.id,
    `Sale of ${lines.length} line(s), total KES ${sale.totalAmount}`,
    { totalAmount: sale.totalAmount.toString(), lineCount: lines.length });

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

  await deleteSale(saleId);
  const updated = await postSale({
    customerId: customerId || undefined,
    date,
    recordedById: session.user.id,
    lines,
    payments,
  });

  await logAction(session.user.id, "UPDATE_SALE", "Sale", updated.id,
    `Sale updated — ${lines.length} line(s), total KES ${updated.totalAmount}`,
    { previousSaleId: saleId, totalAmount: updated.totalAmount.toString() });

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

  await deleteSale(saleId);
  await logAction(session.user.id, "DELETE_SALE", "Sale", saleId,
    `Sale ${saleId} deleted — stock restored`);

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/debtors");
  revalidatePath("/customers");
}
