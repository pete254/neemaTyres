export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getShopInfo } from "@/lib/shopInfo";
import { QuotationPDF } from "@/lib/pdf/QuotationPDF";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quotation, shop] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { name: true } },
      },
    }),
    getShopInfo(),
  ]);
  if (!quotation) return notFound();

  const data = {
    ...quotation,
    lines: quotation.lines.map((l) => ({
      ...l,
      unitPrice: l.unitPrice.toString(),
      lineTotal: l.lineTotal.toString(),
    })),
  };

  const buffer = await renderToBuffer(createElement(QuotationPDF, { quotation: data, shop }));
  const quotNo = quotation.id.slice(-8).toUpperCase();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quotation-${quotNo}.pdf"`,
    },
  });
}
