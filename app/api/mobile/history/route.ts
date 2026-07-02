import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "50"), 100);
  const cursor = searchParams.get("cursor") ?? undefined;

  const logs = await prisma.auditLog.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return ok({
    logs,
    nextCursor: logs.length === take ? logs[logs.length - 1].id : null,
  });
}
