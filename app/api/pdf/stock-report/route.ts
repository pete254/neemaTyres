export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getInventory } from "@/lib/queries";
import { getShopInfo } from "@/lib/shopInfo";
import { StockReportPDF } from "@/lib/pdf/StockReportPDF";
import { getLogoDataUri } from "@/lib/pdf/logoImage";

const BUCKET_ORDER = ["22.5", "20", "19.5", "17.5", "16", "15", "14", "13"];
const bucketRank = (b: string) => { const i = BUCKET_ORDER.indexOf(b); return i === -1 ? 99 : i; };

export async function GET() {
  const [raw, shop, logoSrc] = await Promise.all([getInventory({}), getShopInfo(), Promise.resolve(getLogoDataUri())]);

  const variants = [...raw].sort((a, b) => {
    const bd = bucketRank(a.sizeBucket) - bucketRank(b.sizeBucket);
    if (bd !== 0) return bd;
    const sd = a.sizeCanonical.localeCompare(b.sizeCanonical);
    if (sd !== 0) return sd;
    return a.brand.name.localeCompare(b.brand.name);
  });

  const printDate = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(StockReportPDF, { variants, shop, printDate, logoSrc }) as any);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stock-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
