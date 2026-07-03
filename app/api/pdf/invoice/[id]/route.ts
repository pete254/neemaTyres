export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { notFound } from "next/navigation";
import { getSaleById } from "@/lib/queries/saleById";
import { getShopInfo } from "@/lib/shopInfo";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import { getLogoDataUri } from "@/lib/pdf/logoImage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, shop, logoSrc] = await Promise.all([getSaleById(id), getShopInfo(), Promise.resolve(getLogoDataUri())]);
  if (!sale) return notFound();

  const data = {
    ...sale,
    invoiceNo: sale.invoiceNo,
    totalAmount: sale.totalAmount.toString(),
    lines: sale.lines.map((l) => ({ ...l, unitPrice: l.unitPrice.toString(), lineTotal: l.lineTotal.toString() })),
    payments: sale.payments.map((p) => ({ ...p, amount: p.amount.toString() })),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(InvoicePDF, { sale: data, shop, logoSrc }) as any);
  const invoiceNo = sale.invoiceNo ?? sale.id.slice(-8).toUpperCase();
  const customer = sale.customer?.name?.replace(/\s+/g, "-").toLowerCase() ?? "walk-in";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoiceNo}-${customer}.pdf"`,
    },
  });
}
