import { NextRequest } from "next/server";
import { verifyMobileToken, unauthorized } from "@/app/api/mobile/_auth";
import { ok } from "@/app/api/mobile/_serialize";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  let user;
  try { user = await verifyMobileToken(req); } catch { return unauthorized(); }

  const quotations = await prisma.quotation.findMany({
    orderBy: { date: "desc" },
    take: 60,
    include: {
      customer: { select: { name: true } },
      lines: {
        select: { description: true, qty: true, unitPrice: true, lineTotal: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const result = quotations.map((q) => ({
    id: q.id,
    quotationNo: q.quotationNo,
    date: q.date,
    customerName: q.customer?.name ?? null,
    validDays: q.validDays,
    note: q.note,
    total: q.lines.reduce((s, l) => s.plus(l.lineTotal), new Decimal(0)).toFixed(2),
    lines: q.lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice.toString(),
      lineTotal: l.lineTotal.toString(),
    })),
  }));

  return ok(result);
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await verifyMobileToken(req); } catch { return unauthorized(); }

  const body = await req.json();
  const linesRaw = body.lines as Array<{ description: string; qty: string; unitPrice: string }>;

  if (!linesRaw?.length) {
    return Response.json({ error: "At least one line required" }, { status: 400 });
  }

  const lines = linesRaw.map((l, i) => {
    const qty = parseInt(l.qty);
    const unitPrice = new Decimal(l.unitPrice);
    return {
      description: l.description.trim(),
      qty,
      unitPrice,
      lineTotal: unitPrice.times(qty),
      sortOrder: i,
    };
  });

  const quotDate = body.date ? new Date(body.date) : new Date();
  const year = quotDate.getFullYear();
  const existingCount = await prisma.quotation.count({ where: { quotationNo: { startsWith: `Q${year}-` } } });
  const quotationNo = `Q${year}-${String(existingCount + 1).padStart(3, "0")}`;

  const quotation = await prisma.quotation.create({
    data: {
      quotationNo,
      date: quotDate,
      validDays: body.validDays ? parseInt(body.validDays) : 14,
      note: body.note?.trim() || null,
      customerId: body.customerId || null,
      createdById: user.userId,
      lines: { create: lines },
    },
    include: { lines: true },
  });

  return ok(quotation);
}
