"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import {
  postSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment,
} from "@/lib/posting";
import { logAction } from "@/lib/audit";

export async function createSupplierPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await postSupplierPayment({
    supplierId: formData.get("supplierId") as string,
    amount: new Decimal(formData.get("amount") as string),
    date: new Date(formData.get("date") as string),
    note: (formData.get("note") as string) || undefined,
    recordedById: session.user.id,
  });

  revalidatePath("/suppliers");
  redirect("/supplier-payments/new?success=1");
}

export async function editSupplierPayment(paymentId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const amount = new Decimal(formData.get("amount") as string);
  if (!amount.isFinite() || amount.lte(0)) throw new Error("Amount must be greater than 0");
  const supplierId = formData.get("supplierId") as string;

  const { before, after } = await updateSupplierPayment({
    id: paymentId,
    supplierId,
    amount,
    date: new Date(formData.get("date") as string),
    note: (formData.get("note") as string) || undefined,
  });

  await logAction(session.user.id, "UPDATE_SUPPLIER_PAYMENT", "SupplierPayment", paymentId,
    `Supplier payment edited — ${before.amount.toString()} → ${after.amount.toString()}`,
    {
      before: { supplierId: before.supplierId, amount: before.amount.toString(), date: before.date, note: before.note },
      after: { supplierId: after.supplierId, amount: after.amount.toString(), date: after.date, note: after.note },
    });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${before.supplierId}`);
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/supplier-payments/new");
  redirect(`/supplier-payments/new?supplier=${supplierId}&updated=1`);
}

export async function removeSupplierPayment(paymentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const payment = await deleteSupplierPayment(paymentId);

  await logAction(session.user.id, "DELETE_SUPPLIER_PAYMENT", "SupplierPayment", paymentId,
    `Supplier payment deleted — ${payment.amount.toString()}`,
    { supplierId: payment.supplierId, amount: payment.amount.toString(), date: payment.date, note: payment.note });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${payment.supplierId}`);
  revalidatePath("/supplier-payments/new");
  redirect(`/supplier-payments/new?supplier=${payment.supplierId}&deleted=1`);
}
