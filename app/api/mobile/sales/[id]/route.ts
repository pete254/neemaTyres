import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { deleteSale } from "@/lib/posting";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  try {
    await deleteSale(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[mobile/sales DELETE]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to delete sale" },
      { status: 500 }
    );
  }
}
