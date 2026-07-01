import { prisma } from "@/lib/prisma";

export async function upsertCustomerByName(
  name: string,
  phone: string | null,
  userId: string
): Promise<string> {
  const trimmed = name.trim();
  const existing = await prisma.customer.findUnique({ where: { name: trimmed } });
  if (existing) {
    if (phone && existing.phone !== phone) {
      await prisma.customer.update({ where: { id: existing.id }, data: { phone } });
    }
    return existing.id;
  }
  const created = await prisma.customer.create({
    data: { name: trimmed, phone: phone?.trim() || null, recordedById: userId },
  });
  return created.id;
}

export async function createCustomerRecord(
  name: string,
  phone: string | null,
  userId: string
): Promise<{ id: string; name: string; phone: string | null }> {
  const trimmed = name.trim();
  const existing = await prisma.customer.findUnique({ where: { name: trimmed } });
  if (existing) return existing;
  return prisma.customer.create({
    data: { name: trimmed, phone: phone?.trim() || null, recordedById: userId },
    select: { id: true, name: true, phone: true },
  });
}
