export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getFilteredSupplierStatement, parseStatementFilters } from "@/lib/queries";
import { getShopInfo } from "@/lib/shopInfo";
import { SupplierStatementPDF } from "@/lib/pdf/SupplierStatementPDF";
import { getLogoDataUri } from "@/lib/pdf/logoImage";

const TYPE_LABEL = { purchase: "Purchases only", payment: "Payments only", return: "Purchase returns only" };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const filters = parseStatementFilters(Object.fromEntries(searchParams));
  const download = searchParams.get("download") === "1";

  let statement;
  try {
    statement = await getFilteredSupplierStatement(id, filters);
  } catch {
    return new Response("Supplier not found", { status: 404 });
  }
  const shop = await getShopInfo();

  const filterNotes = [
    filters.type && filters.type !== "all" ? TYPE_LABEL[filters.type] : null,
    filters.q ? `Matching "${filters.q}"` : null,
  ].filter((x): x is string => !!x);

  const { supplier, entries } = statement;
  const data = {
    supplier: {
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      town: supplier.town,
      poBox: supplier.poBox,
    },
    entries: entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      description: e.description,
      debit: e.debit.toString(),
      credit: e.credit.toString(),
      runningBalance: e.runningBalance.toString(),
    })),
    from: filters.from ?? null,
    to: filters.to ?? null,
    filterNotes,
    openingBalance: statement.openingBalance?.toFixed(2) ?? null,
    totalDebit: statement.totalDebit.toFixed(2),
    totalCredit: statement.totalCredit.toFixed(2),
    closingBalance: statement.closingBalance.toFixed(2),
    generatedOn: new Date().toISOString(),
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(SupplierStatementPDF, { data, shop, logoSrc: getLogoDataUri() }) as any
  );
  const slug = supplier.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const range = filters.from || filters.to ? `-${filters.from ?? "start"}-to-${filters.to ?? "now"}` : "";
  const filename = `statement-${slug}${range}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
