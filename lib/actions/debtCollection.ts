"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postDebtCollection } from "@/lib/posting";
import { logAction } from "@/lib/audit";

export async function createDebtCollection(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const amt = new Decimal(formData.get("amount") as string);
  const customerId = formData.get("customerId") as string;
  const col = await postDebtCollection({
    customerId,
    amount: amt,
    channel: formData.get("channel") as any,
    date: new Date(formData.get("date") as string),
    note: (formData.get("note") as string) || undefined,
    recordedById: session.user.id,
  });

  await logAction(session.user.id, "CREATE_DEBT_COLLECTION", "DebtCollection", col.id,
    `Debt collection KES ${amt.toFixed(2)} via ${col.channel}`,
    { customerId, amount: amt.toFixed(2), channel: col.channel });

  revalidatePath("/debtors");
  redirect("/debt-collections/new?success=1");
}
