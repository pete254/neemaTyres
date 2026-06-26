"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { postDebtCollection } from "@/lib/posting";

export async function createDebtCollection(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await postDebtCollection({
    customerId: formData.get("customerId") as string,
    amount: new Decimal(formData.get("amount") as string),
    channel: formData.get("channel") as any,
    date: new Date(formData.get("date") as string),
    note: (formData.get("note") as string) || undefined,
    recordedById: session.user.id,
  });

  revalidatePath("/debtors");
  redirect("/debt-collections/new?success=1");
}
