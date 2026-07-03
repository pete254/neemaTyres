import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

  const info = await prisma.shopInfo.findUnique({ where: { id: "main" } });
  return ok(info ?? {
    id: "main", name: "", address: null, town: null, county: null,
    country: "Kenya", poBox: null, email: null, phone: null, terms: [],
  });
}

export async function PATCH(req: NextRequest) {
  try { await verifyMobileToken(req); } catch { return unauthorized(); }

  const body = await req.json();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
  const terms = Array.isArray(body.terms)
    ? (body.terms as string[]).map((t) => t.trim()).filter(Boolean)
    : typeof body.terms === "string"
      ? body.terms.split("\n").map((t: string) => t.trim()).filter(Boolean)
      : [];

  const data = {
    name: (body.name as string)?.trim() ?? "",
    address: str(body.address),
    town: str(body.town),
    county: str(body.county),
    country: (body.country as string)?.trim() || "Kenya",
    poBox: str(body.poBox),
    email: str(body.email),
    phone: str(body.phone),
    terms,
  };

  const info = await prisma.shopInfo.upsert({
    where: { id: "main" },
    create: { id: "main", ...data },
    update: data,
  });

  return ok(info);
}
