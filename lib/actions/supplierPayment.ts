"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postSupplierPayment } from "@/lib/posting";

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
