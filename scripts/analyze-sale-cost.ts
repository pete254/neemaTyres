/**
 * Read-only rebuild PREVIEW: what would each sale line's unitCostAtSale become
 * if we recomputed cost of goods sold in business-date order with the
 * negative-stock guard?
 *
 * Anchor / seeding per variant:
 *   - opening STOCK entry's unitCost (the carried-forward cost) when present;
 *   - else the earliest purchase's unit cost (fallback for the 3 variants that
 *     have no opening entry), so a sale that predates its purchase still gets a
 *     real cost basis instead of 0.
 *
 * This NEVER writes to ProductVariant/SaleLine. It only prints a summary and an
 * audit CSV of every line that would change.
 *
 *   npx tsx --env-file=.env scripts/analyze-sale-cost.ts
 *   npx tsx --env-file=.env scripts/analyze-sale-cost.ts --trace="17.5 Linglong Small"
 */
import dns from "node:dns";
// Force IPv4 — this host's IPv6 route to Neon is a black hole and Node's fetch
// won't fall back to the IPv4 records like curl does.
const _origLookup = dns.lookup.bind(dns);
// @ts-expect-error override signature
dns.lookup = (hostname: string, options: unknown, cb: unknown) => {
  if (typeof options === "function") { cb = options; options = {}; }
  const opts = typeof options === "object" && options ? { ...options, family: 4 } : { family: 4 };
  // @ts-expect-error passthrough
  return _origLookup(hostname, opts, cb);
};
import { neonConfig } from "@neondatabase/serverless";
neonConfig.poolQueryViaFetch = true;

import { prisma } from "@/lib/prisma";
import { computeWac } from "@/lib/posting/wac";
import Decimal from "decimal.js";
import { writeFileSync } from "node:fs";

const CSV_PATH = "sale-cost-corrections.csv";
const APPLY = process.argv.includes("--apply");
const TRACE = process.argv.find((a) => a.startsWith("--trace="))?.slice("--trace=".length);
const d = (x: unknown) => new Decimal((x as { toString(): string }).toString());

interface Ev {
  at: number; date: number; kind: string; qty: number; unit: Decimal;
  saleLineId?: string; invoiceNo?: string | null; saleDate?: Date; stored?: Decimal;
}

interface Row {
  saleLineId: string; invoiceNo: string | null; date: string; label: string;
  qty: number; stored: Decimal; correct: Decimal;
}

async function main() {
  const [variants, openings, pLines, sLines, returns] = await Promise.all([
    prisma.productVariant.findMany({ include: { brand: true } }),
    prisma.openingBalanceEntry.findMany({ where: { kind: "STOCK" } }),
    prisma.purchaseLine.findMany({ include: { purchase: { select: { date: true, createdAt: true } } } }),
    prisma.saleLine.findMany({ include: { sale: { select: { date: true, createdAt: true, invoiceNo: true } } } }),
    prisma.return.findMany(),
  ]);

  const openByV = new Map<string, { qty: number; wac: Decimal }>();
  for (const o of openings) {
    const cur = openByV.get(o.variantId ?? "") ?? { qty: 0, wac: new Decimal(0) };
    cur.qty += o.qty ?? 0;
    if (o.unitCost != null) cur.wac = d(o.unitCost);
    openByV.set(o.variantId ?? "", cur);
  }

  // Fallback seed for variants with no opening entry: earliest purchase's unit cost.
  const firstPurchase = new Map<string, { date: number; cost: Decimal }>();
  for (const p of pLines) {
    const t = p.purchase.date.getTime();
    const prev = firstPurchase.get(p.variantId);
    if (!prev || t < prev.date) firstPurchase.set(p.variantId, { date: t, cost: d(p.unitCost) });
  }

  const evByV = new Map<string, Ev[]>();
  const push = (vid: string, e: Ev) => { (evByV.get(vid) ?? evByV.set(vid, []).get(vid)!).push(e); };
  for (const p of pLines) push(p.variantId, { at: p.purchase.createdAt.getTime(), date: p.purchase.date.getTime(), kind: "PURCHASE", qty: p.qty, unit: d(p.unitCost) });
  for (const s of sLines) push(s.variantId, { at: s.sale.createdAt.getTime(), date: s.sale.date.getTime(), kind: "SALE", qty: s.qty, unit: new Decimal(0), saleLineId: s.id, invoiceNo: s.sale.invoiceNo, saleDate: s.sale.date, stored: d(s.unitCostAtSale) });
  for (const r of returns) push(r.variantId, { at: r.createdAt.getTime(), date: r.date.getTime(), kind: r.type, qty: r.qty, unit: d(r.unitValue) });

  const rows: Row[] = [];
  for (const v of variants) {
    const label = `${v.sizeCanonical} ${v.brand.name}${v.subLabel ? " " + v.subLabel : ""}${v.position !== "NONE" ? " " + v.position : ""}`.trim();
    let open = openByV.get(v.id);
    if (!open) {
      const fb = firstPurchase.get(v.id);
      open = { qty: 0, wac: fb ? fb.cost : new Decimal(0) }; // fallback for no-opening variants
    }
    const evs = evByV.get(v.id) ?? [];
    const byDate = [...evs].sort((a, b) => a.date - b.date || a.at - b.at);
    const doTrace = TRACE && label.toLowerCase().includes(TRACE.toLowerCase());
    if (doTrace) console.log(`\n── TRACE ${label} — seed qty ${open.qty} wac ${open.wac.toFixed(2)} ──`);

    let qty = open.qty, wac = open.wac;
    for (const e of byDate) {
      const stockIn = e.kind === "PURCHASE" || e.kind === "SALE_RETURN";
      if (stockIn) {
        ({ qty, wac } = computeWac({ qty, wac }, e.qty, e.unit));
        if (doTrace) console.log(`  ${new Date(e.date).toISOString().slice(0, 10)} ${e.kind.padEnd(12)} +${e.qty} @${e.unit.toFixed(2)} -> qty ${qty} wac ${wac.toFixed(2)}`);
        continue;
      }
      if (e.kind === "SALE") {
        const correct = wac.toDecimalPlaces(2);
        const stored = e.stored!.toDecimalPlaces(2);
        if (doTrace) console.log(`  ${new Date(e.date).toISOString().slice(0, 10)} SALE ${e.invoiceNo ?? "(none)"} -${e.qty}  stored ${stored.toFixed(2)}  correct ${correct.toFixed(2)}${correct.equals(stored) ? "" : "  <-- CHANGE"}`);
        if (!correct.equals(stored)) {
          rows.push({ saleLineId: e.saleLineId!, invoiceNo: e.invoiceNo ?? null, date: new Date(e.saleDate!).toISOString().slice(0, 10), label, qty: e.qty, stored, correct });
        }
      }
      qty -= e.qty; // SALE and PURCHASE_RETURN reduce stock
    }
  }

  rows.sort((a, b) => b.stored.minus(b.correct).mul(b.qty).abs().comparedTo(a.stored.minus(a.correct).mul(a.qty).abs()));

  const header = "saleLineId,invoiceNo,date,label,qty,storedUnitCost,correctUnitCost,deltaPerUnit,profitDelta";
  const lines = rows.map((r) => {
    const profitDelta = r.stored.minus(r.correct).mul(r.qty);
    return [r.saleLineId, r.invoiceNo ?? "", r.date, `"${r.label}"`, r.qty, r.stored.toFixed(2), r.correct.toFixed(2), r.stored.minus(r.correct).toFixed(2), profitDelta.toFixed(2)].join(",");
  });
  writeFileSync(CSV_PATH, [header, ...lines].join("\n") + "\n");

  let totalProfitDelta = new Decimal(0);
  const invoices = new Set<string>();
  console.log(`\n${rows.length} sale line(s) would change. Audit CSV: ${CSV_PATH}\n`);
  console.log("invoice".padEnd(10), "date".padEnd(11), "label".padEnd(26), "qty".padStart(4), "stored".padStart(10), "correct".padStart(10), "profitΔ".padStart(11));
  for (const r of rows) {
    const pd = r.stored.minus(r.correct).mul(r.qty);
    totalProfitDelta = totalProfitDelta.plus(pd);
    invoices.add(r.invoiceNo ?? "(none)");
    console.log((r.invoiceNo ?? "(none)").padEnd(10), r.date.padEnd(11), r.label.slice(0, 25).padEnd(26), String(r.qty).padStart(4), r.stored.toFixed(2).padStart(10), r.correct.toFixed(2).padStart(10), pd.toFixed(2).padStart(11));
  }
  console.log(`\n${rows.length} lines across ${invoices.size} invoice(s). Net profit restatement: ${totalProfitDelta.toFixed(2)} (positive = profit currently understated).`);

  if (!APPLY) {
    console.log("No changes written. Re-run with --apply to update unitCostAtSale for these lines.");
    await prisma.$disconnect();
    return;
  }

  // Each line is a conditional updateMany on unitCostAtSale only, guarded on the
  // value we measured — a line changed since the scan updates 0 rows and is
  // reported, never clobbered. Old values are preserved in the audit CSV.
  let applied = 0;
  const skipped: string[] = [];
  for (const r of rows) {
    const res = await prisma.saleLine.updateMany({
      where: { id: r.saleLineId, unitCostAtSale: r.stored.toFixed(2) },
      data: { unitCostAtSale: r.correct.toFixed(2) },
    });
    if (res.count === 1) applied++;
    else skipped.push(`${r.invoiceNo ?? "(none)"} ${r.label}`);
  }
  console.log(`\n✅ Applied ${applied}/${rows.length} sale-cost corrections (unitCostAtSale only). Old values preserved in ${CSV_PATH}.`);
  if (skipped.length) console.log(`Skipped (value changed since scan): ${skipped.join(", ")}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error("ERROR:", e?.message ?? e); process.exit(1); });
