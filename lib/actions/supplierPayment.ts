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
import {
  describeSupplierPayment, describeSupplierPaymentEdited, supplierPaymentSnap,
} from "@/lib/auditDetail";

export async function createSupplierPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const payment = await postSupplierPayment({
    supplierId: formData.get("supplierId") as string,
    amount: new Decimal(formData.get("amount") as string),
    date: new Date(formData.get("date") as string),
    note: (formData.get("note") as string) || undefined,
    recordedById: session.user.id,
  });

  const snap = await supplierPaymentSnap(payment);
  await logAction(session.user.id, "CREATE_SUPPLIER_PAYMENT", "SupplierPayment", payment.id,
    describeSupplierPayment(snap, "Paid"), { supplierId: payment.supplierId, payment: snap });

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

  const [beforeSnap, afterSnap] = await Promise.all([supplierPaymentSnap(before), supplierPaymentSnap(after)]);
  await logAction(session.user.id, "UPDATE_SUPPLIER_PAYMENT", "SupplierPayment", paymentId,
    describeSupplierPaymentEdited(beforeSnap, afterSnap),
    { before: beforeSnap, after: afterSnap, supplierIds: [before.supplierId, after.supplierId] });

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

  const snap = await supplierPaymentSnap(payment);
  await logAction(session.user.id, "DELETE_SUPPLIER_PAYMENT", "SupplierPayment", paymentId,
    describeSupplierPayment(snap, "Deleted payment"), { supplierId: payment.supplierId, payment: snap });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${payment.supplierId}`);
  revalidatePath("/supplier-payments/new");
  redirect(`/supplier-payments/new?supplier=${payment.supplierId}&deleted=1`);
}
