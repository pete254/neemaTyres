export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { notFound } from "next/navigation";
import { getSaleById } from "@/lib/queries/saleById";
import { getShopInfo } from "@/lib/shopInfo";
import { DeliveryNotePDF } from "@/lib/pdf/DeliveryNotePDF";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, shop] = await Promise.all([getSaleById(id), getShopInfo()]);
  if (!sale) return notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(DeliveryNotePDF, { sale, shop }) as any);
  const docNo = sale.id.slice(-8).toUpperCase();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="delivery-note-${docNo}.pdf"`,
    },
  });
}
