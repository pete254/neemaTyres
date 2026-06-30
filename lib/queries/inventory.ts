import { prisma } from "@/lib/prisma";

export async function getInventory(filters?: {
  search?: string;
  position?: string;
}) {
  return prisma.productVariant.findMany({
    where: {
      ...(filters?.search
        ? {
            OR: [
              {
                sizeBucket: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                sizeCanonical: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                patternCode: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(filters?.position
        ? { position: filters.position as any }
        : {}),
    },
    include: { brand: true, recordedBy: { select: { name: true } } },
    orderBy: [{ sizeCanonical: "asc" }, { brand: { name: "asc" } }], // post-sorted in caller
  });
}
