export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import Decimal from "decimal.js";
import { getSalesByIds } from "@/lib/queries/saleById";
import { getCustomerSaleBalances } from "@/lib/queries/customerDebt";
import { getShopInfo } from "@/lib/shopInfo";
import { CombinedInvoicePDF } from "@/lib/pdf/CombinedInvoicePDF";
import { getLogoDataUri } from "@/lib/pdf/logoImage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let ids = [...new Set((searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  const download = searchParams.get("download") === "1";
  // ?customerId=…&unpaid=1 → every credit sale of that customer with a balance left.
  const customerIdParam = searchParams.get("customerId");
  const unpaidOnly = searchParams.get("unpaid") === "1";
  // ?balance=1 → show amount paid and balance due (used from the debtors pages).
  const showBalance = searchParams.get("balance") === "1" || unpaidOnly;

  let balances: Awaited<ReturnType<typeof getCustomerSaleBalances>> = null;
  if (customerIdParam && unpaidOnly) {
    balances = await getCustomerSaleBalances(customerIdParam);
    if (!balances) return new Response("Customer not found", { status: 404 });
    ids = balances.sales.filter((s) => s.outstanding.gt(0)).map((s) => s.saleId);
    if (ids.length === 0) return new Response("This customer has no unpaid sales", { status: 404 });
  }

  if (ids.length === 0) return new Response("No sales selected", { status: 400 });
  if (ids.length > 200) return new Response("Too many sales selected (max 200)", { status: 400 });

  const [sales, shop] = await Promise.all([getSalesByIds(ids), getShopInfo()]);
  if (sales.length !== ids.length) return new Response("Some sales were not found", { status: 404 });

  const customerIds = new Set(sales.map((s) => s.customerId));
  const customer = sales[0].customer;
  if (customerIds.size !== 1 || !customer) {
    return new Response("All selected sales must belong to the same customer", { status: 400 });
  }

  if (showBalance && !balances) balances = await getCustomerSaleBalances(customer.id);
  const balanceById = new Map(balances?.sales.map((b) => [b.saleId, b]) ?? []);
  // A sale with no credit portion was fully paid at the time of sale.
  const outstandingOf = (saleId: string) =>
    balanceById.get(saleId)?.outstanding ?? new Decimal(0);

  const invoices = sales.map((sale) => ({
    id: sale.id,
    invoiceNo: sale.invoiceNo ?? sale.id.slice(-8).toUpperCase(),
    date: sale.date.toISOString(),
    total: sale.totalAmount.toString(),
    ...(showBalance
      ? {
          paid: new Decimal(sale.totalAmount.toString()).minus(outstandingOf(sale.id)).toFixed(2),
          due: outstandingOf(sale.id).toFixed(2),
        }
      : {}),
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
  const totalDue = showBalance
    ? sales.reduce((s, sale) => s.plus(outstandingOf(sale.id)), new Decimal(0)).toFixed(2)
    : undefined;

  const buffer = await renderToBuffer(
    createElement(CombinedInvoicePDF, {
      customer,
      invoices,
      grandTotal,
      totalDue,
      issuedOn: new Date().toISOString(),
      shop,
      logoSrc: getLogoDataUri(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  );
  const slug = customer.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const filename =
    invoices.length === 1
      ? `invoice-${invoices[0].invoiceNo}-${slug}.pdf`
      : `invoice-${slug}-combined-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
