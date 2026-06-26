"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postSale } from "@/lib/posting";

export async function createSale(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const linesRaw = JSON.parse(formData.get("lines") as string);
  const paymentsRaw = JSON.parse(formData.get("payments") as string);
  const customerId = formData.get("customerId") as string | null;
  const date = new Date(formData.get("date") as string);

  const lines = linesRaw.map((l: any) => ({
    variantId: l.variantId,
    qty: Number(l.qty),
    unitPrice: new Decimal(l.unitPrice),
  }));
  const payments = paymentsRaw.map((p: any) => ({
    channel: p.channel as any,
    amount: new Decimal(p.amount),
  }));

  await postSale({
    customerId: customerId || undefined,
    date,
    recordedById: session.user.id,
    lines,
    payments,
  });

  revalidatePath("/inventory");
  revalidatePath("/debtors");
  redirect("/sales/new?success=1");
}
