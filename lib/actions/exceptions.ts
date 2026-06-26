"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function resolveException(flagId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await prisma.exceptionFlag.update({
    where: { id: flagId },
    data: { resolved: true, resolvedById: session.user.id },
  });

  revalidatePath("/exceptions");
}
