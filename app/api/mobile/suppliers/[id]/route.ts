import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getSupplierStatement } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const { id } = await params;
  const data = await getSupplierStatement(id);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return ok(data);
}
