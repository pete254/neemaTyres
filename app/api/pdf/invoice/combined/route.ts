export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import Decimal from "decimal.js";
import { getSalesByIds } from "@/lib/queries/saleById";
import { getShopInfo } from "@/lib/shopInfo";
import { CombinedInvoicePDF } from "@/lib/pdf/CombinedInvoicePDF";
import { getLogoDataUri } from "@/lib/pdf/logoImage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = [...new Set((searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  const download = searchParams.get("download") === "1";

  if (ids.length === 0) return new Response("No sales selected", { status: 400 });
  if (ids.length > 200) return new Response("Too many sales selected (max 200)", { status: 400 });

  const [sales, shop] = await Promise.all([getSalesByIds(ids), getShopInfo()]);
  if (sales.length !== ids.length) return new Response("Some sales were not found", { status: 404 });

  const customerIds = new Set(sales.map((s) => s.customerId));
  const customer = sales[0].customer;
  if (customerIds.size !== 1 || !customer) {
    return new Response("All selected sales must belong to the same customer", { status: 400 });
  }

  const invoices = sales.map((sale) => ({
    id: sale.id,
    invoiceNo: sale.invoiceNo ?? sale.id.slice(-8).toUpperCase(),
    date: sale.date.toISOString(),
    total: sale.totalAmount.toString(),
    lines: sale.lines.map((l) => ({
      id: l.id,
      qty: l.qty,
      unitPrice: l.unitPrice.toString(),
      lineTotal: l.lineTotal.toString(),
      label: `${l.variant.brand.name} ${l.variant.sizeCanonical}${l.variant.subLabel ? " " + l.variant.subLabel : ""}`,
    })),
  }));
  const grandTotal = sales
    .reduce((s, sale) => s.plus(sale.totalAmount.toString()), new Decimal(0))
    .toFixed(2);

  const buffer = await renderToBuffer(
    createElement(CombinedInvoicePDF, {
      customer,
      invoices,
      grandTotal,
      issuedOn: new Date().toISOString(),
      shop,
      logoSrc: getLogoDataUri(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  );
  const slug = customer.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const filename = `invoice-${slug}-combined-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
