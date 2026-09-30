export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import Decimal from "decimal.js";
import { getSupplierStatement, hideReversalPairs } from "@/lib/queries";
import { getShopInfo } from "@/lib/shopInfo";
import { SupplierStatementPDF } from "@/lib/pdf/SupplierStatementPDF";
import { getLogoDataUri } from "@/lib/pdf/logoImage";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const hideReversals = searchParams.get("hideReversals") === "1";
  const download = searchParams.get("download") === "1";

  let statement;
  try {
    statement = await getSupplierStatement(id);
  } catch {
    return new Response("Supplier not found", { status: 404 });
  }
  const shop = await getShopInfo();

  const entries = hideReversals
    ? hideReversalPairs(statement.entries).entries
    : statement.entries;

  const totalDebit = entries.reduce((s, e) => s.plus(e.debit.toString()), new Decimal(0));
  const totalCredit = entries.reduce((s, e) => s.plus(e.credit.toString()), new Decimal(0));

  const { supplier } = statement;
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
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    closingBalance: totalDebit.minus(totalCredit).toFixed(2),
    generatedOn: new Date().toISOString(),
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(SupplierStatementPDF, { data, shop, logoSrc: getLogoDataUri() }) as any
  );
  const slug = supplier.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const filename = `statement-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
