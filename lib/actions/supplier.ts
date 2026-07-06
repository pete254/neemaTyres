"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | null {
  const v = (formData.get(key) as string | null)?.trim();
  return v || null;
}

export async function createSupplier(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Supplier name is required");

  await prisma.supplier.create({
    data: {
      name,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      town: str(formData, "town"),
      poBox: str(formData, "poBox"),
      // openingBalance is not settable here — an opening payable belongs in the
      // supplier ledger as an entry, not as a scalar (which nothing reads).
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/purchases/new");
  redirect("/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Supplier name is required");

  await prisma.supplier.update({
    where: { id },
    data: {
      name,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      town: str(formData, "town"),
      poBox: str(formData, "poBox"),
      // openingBalance intentionally left untouched (not edited via this form).
    },
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect("/suppliers");
}
