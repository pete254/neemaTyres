import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getSuppliers } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const data = await getSuppliers();
  return ok(data);
}

export async function POST(req: NextRequest) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

  const body = await req.json();
  const name = (body.name as string)?.trim();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });

  const supplier = await prisma.supplier.create({
    data: {
      name,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
    },
  });
  return ok(supplier);
}
