import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    ({ userId } = await verifyMobileToken(req));
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  try {
    await prisma.exceptionFlag.update({
      where: { id },
      data: { resolved: true, resolvedById: userId },
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[mobile/exceptions resolve]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
