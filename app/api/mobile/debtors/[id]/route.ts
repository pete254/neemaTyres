import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getCustomerDebt } from "@/lib/queries";
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

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return Response.json({ error: "Not found" }, { status: 404 });

  const [debtResult, profile] = await Promise.all([
    getCustomerDebt(customer.name),
    getCustomerProfile(id),
  ]);

  return ok({ customer, debtResult, profile });
}
