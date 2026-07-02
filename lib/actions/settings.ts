"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateShopInfo(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const terms = (formData.get("terms") as string)
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  await prisma.shopInfo.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      name: (formData.get("name") as string).trim(),
      address: (formData.get("address") as string)?.trim() || null,
      town: (formData.get("town") as string)?.trim() || null,
      county: (formData.get("county") as string)?.trim() || null,
      country: (formData.get("country") as string)?.trim() || "Kenya",
      poBox: (formData.get("poBox") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      terms,
    },
    update: {
      name: (formData.get("name") as string).trim(),
      address: (formData.get("address") as string)?.trim() || null,
      town: (formData.get("town") as string)?.trim() || null,
      county: (formData.get("county") as string)?.trim() || null,
      country: (formData.get("country") as string)?.trim() || "Kenya",
      poBox: (formData.get("poBox") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      terms,
    },
  });

  revalidatePath("/settings");
}
