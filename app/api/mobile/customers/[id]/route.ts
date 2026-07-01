import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getCustomerProfile } from "@/lib/queries/customerProfile";
import { prisma } from "@/lib/prisma";

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
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const fromDate = from ? new Date(from + "T00:00:00Z") : undefined;
  const toDate = to ? new Date(to + "T23:59:59Z") : undefined;

  const data = await getCustomerProfile(id, fromDate, toDate);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return ok(data);
}

export async function PATCH(
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
    const body = (await req.json()) as {
      phone?: string; email?: string; address?: string; town?: string; poBox?: string;
    };
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        phone:   body.phone?.trim() || null,
        email:   body.email?.trim() || null,
        address: body.address?.trim() || null,
        town:    body.town?.trim() || null,
        poBox:   body.poBox?.trim() || null,
      },
    });
    return ok(customer);
  } catch (err) {
    console.error("[mobile/customers PATCH]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
