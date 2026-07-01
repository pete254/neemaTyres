"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export { upsertCustomerByName } from "@/lib/domain/customer";

export async function createCustomer(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;

  if (!name) throw new Error("Name is required");

  const existing = await prisma.customer.findUnique({ where: { name } });
  if (existing) {
    if (phone && existing.phone !== phone) {
      await prisma.customer.update({ where: { id: existing.id }, data: { phone } });
    }
    redirect(`/customers/${existing.id}`);
  }

  const customer = await prisma.customer.create({
    data: { name, phone, recordedById: session.user.id },
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}
