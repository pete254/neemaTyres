import { prisma } from "@/lib/prisma";

export async function getExceptionFlags(showResolved = false) {
  return prisma.exceptionFlag.findMany({
    where: showResolved ? {} : { resolved: false },
    include: { resolvedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
