export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { notFound } from "next/navigation";
import { getSaleById } from "@/lib/queries/saleById";
import { getShopInfo } from "@/lib/shopInfo";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, shop] = await Promise.all([getSaleById(id), getShopInfo()]);
  if (!sale) return notFound();

  const buffer = await renderToBuffer(createElement(InvoicePDF, { sale, shop }));
  const invoiceNo = sale.id.slice(-8).toUpperCase();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoiceNo}.pdf"`,
    },
  });
}
