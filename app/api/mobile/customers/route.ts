import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { getRankedCustomers } from "@/lib/queries/customerProfile";
import { createCustomerRecord } from "@/lib/domain/customer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await verifyMobileToken(req);
  } catch {
    return unauthorized();
  }

  const data = await getRankedCustomers();
  return ok(data);
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ userId } = await verifyMobileToken(req));
  } catch {
    return unauthorized();
  }

  try {
    const { name, phone } = (await req.json()) as {
      name?: string;
      phone?: string;
    };

    if (!name?.trim()) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const customer = await createCustomerRecord(name, phone ?? null, userId);
    return Response.json({ customer });
  } catch (err) {
    console.error("[mobile/customers POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
