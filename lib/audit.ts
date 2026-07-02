import { prisma } from "@/lib/prisma";

export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId, description, metadata: (metadata ?? null) as any },
    });
  } catch (err) {
    console.error("[audit] logAction failed:", err);
  }
}
