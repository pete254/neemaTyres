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

  const openingBalance = (formData.get("openingBalance") as string).trim() || "0";

  await prisma.supplier.create({
    data: {
      name,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      town: str(formData, "town"),
      poBox: str(formData, "poBox"),
      openingBalance,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/purchases/new");
  redirect("/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  if (!name) throw new Error("Supplier name is required");

  const openingBalance = (formData.get("openingBalance") as string).trim() || "0";

  await prisma.supplier.update({
    where: { id },
    data: {
      name,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address: str(formData, "address"),
      town: str(formData, "town"),
      poBox: str(formData, "poBox"),
      openingBalance,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect("/suppliers");
}
