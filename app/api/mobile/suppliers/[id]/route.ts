import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getSupplierStatement } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

  const { id } = await params;
  const data = await getSupplierStatement(id);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return ok(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

  const { id } = await params;
  const body = await req.json();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);

  const name = (body.name as string)?.trim();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name,
      phone: str(body.phone),
      email: str(body.email),
      address: str(body.address),
      town: str(body.town),
      poBox: str(body.poBox),
    },
  });

  return ok(supplier);
}
