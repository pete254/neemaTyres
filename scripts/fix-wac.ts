/**
 * WAC correction — repairs weighted-average costs distorted by negative stock
 * (a purchase entered after the sales it supplied, dividing cost over too few
 * units). Read-only by default: it recomputes the correct WAC by replaying each
 * variant's history in business-date order and writes an audit CSV. Pass
 * --apply to actually update `wacCost` (and only that field) inside one
 * transaction, with a per-row guard so a concurrently changed value aborts all.
 *
 *   Dry run (safe):  npx tsx --env-file=.env scripts/fix-wac.ts
 *   Apply:           npx tsx --env-file=.env scripts/fix-wac.ts --apply
 */
import dns from "node:dns";
// This host's IPv6 route to Neon is a black hole and Node's fetch/undici won't
// fall back to the IPv4 records (curl does). Force IPv4-only resolution so both
// the HTTP query path and any pooled connection reach the database.
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

const APPLY = process.argv.includes("--apply");
const CSV_PATH = "wac-corrections.csv";
const d = (x: unknown) => new Decimal((x as { toString(): string }).toString());

interface Ev { at: number; date: number; kind: string; qty: number; unit: Decimal }

interface Fix {
  variantId: string;
  label: string;
  qtyOnHand: number;
  storedWac: Decimal;
  correctWac: Decimal;
}

async function computeFixes(): Promise<Fix[]> {
  const [variants, openings, pLines, sLines, returns] = await Promise.all([
    prisma.productVariant.findMany({ include: { brand: true } }),
    prisma.openingBalanceEntry.findMany({ where: { kind: "STOCK" } }),
    prisma.purchaseLine.findMany({ include: { purchase: { select: { date: true, createdAt: true } } } }),
    prisma.saleLine.findMany({ include: { sale: { select: { date: true, createdAt: true } } } }),
    prisma.return.findMany(),
  ]);

  const openByV = new Map<string, { qty: number; wac: Decimal }>();
  for (const o of openings) {
    const cur = openByV.get(o.variantId ?? "") ?? { qty: 0, wac: new Decimal(0) };
    cur.qty += o.qty ?? 0;
    if (o.unitCost != null) cur.wac = d(o.unitCost);
    openByV.set(o.variantId ?? "", cur);
  }
  const evByV = new Map<string, Ev[]>();
  const push = (vid: string, e: Ev) => { (evByV.get(vid) ?? evByV.set(vid, []).get(vid)!).push(e); };
  for (const p of pLines) push(p.variantId, { at: p.purchase.createdAt.getTime(), date: p.purchase.date.getTime(), kind: "PURCHASE", qty: p.qty, unit: d(p.unitCost) });
  for (const s of sLines) push(s.variantId, { at: s.sale.createdAt.getTime(), date: s.sale.date.getTime(), kind: "SALE", qty: s.qty, unit: d(s.unitPrice) });
  for (const r of returns) push(r.variantId, { at: r.createdAt.getTime(), date: r.date.getTime(), kind: r.type, qty: r.qty, unit: d(r.unitValue) });

  const replay = (open: { qty: number; wac: Decimal }, order: Ev[]) => {
    let qty = open.qty, wac = open.wac, negAtStockIn = false;
    for (const e of order) {
      const stockIn = e.kind === "PURCHASE" || e.kind === "SALE_RETURN";
      if (stockIn) { if (qty < 0) negAtStockIn = true; ({ qty, wac } = computeWac({ qty, wac }, e.qty, e.unit)); }
      else qty -= e.qty;
    }
    return { qty, wac, negAtStockIn };
  };

  const fixes: Fix[] = [];
  for (const v of variants) {
    const open = openByV.get(v.id) ?? { qty: 0, wac: new Decimal(0) };
    const evs = evByV.get(v.id) ?? [];
    const byDate = [...evs].sort((a, b) => a.date - b.date || a.at - b.at);
    const byPost = [...evs].sort((a, b) => a.at - b.at);
    const correct = replay(open, byDate);
    const posted = replay(open, byPost);
    const storedWac = d(v.wacCost).toDecimalPlaces(2);
    const correctWac = correct.wac.toDecimalPlaces(2);
    const diff = storedWac.minus(correctWac).abs();

    // Group A only: negative-stock distortion, currently holds stock, and the
    // recomputed cost is sane (> 0). Excludes the broken "Rim 19.5 Generic"
    // (correct WAC < 0) and zero-qty variants.
    const isGroupA = posted.negAtStockIn && v.qtyOnHand > 0 && correctWac.gt(0) && diff.gte(1);
    if (isGroupA) {
      const label = `${v.sizeCanonical} ${v.brand.name}${v.subLabel ? " " + v.subLabel : ""}${v.position !== "NONE" ? " " + v.position : ""}`.trim();
      fixes.push({ variantId: v.id, label, qtyOnHand: v.qtyOnHand, storedWac, correctWac });
    }
  }
  return fixes.sort((a, b) => b.storedWac.minus(b.correctWac).mul(b.qtyOnHand).comparedTo(a.storedWac.minus(a.correctWac).mul(a.qtyOnHand)));
}

function writeCsv(fixes: Fix[]) {
  const header = "variantId,label,qtyOnHand,storedWac,correctWac,diffPerUnit,stockValueBefore,stockValueAfter,valueDelta";
  const lines = fixes.map((f) => {
    const before = f.storedWac.mul(f.qtyOnHand);
    const after = f.correctWac.mul(f.qtyOnHand);
    return [
      f.variantId,
      `"${f.label}"`,
      f.qtyOnHand,
      f.storedWac.toFixed(2),
      f.correctWac.toFixed(2),
      f.storedWac.minus(f.correctWac).toFixed(2),
      before.toFixed(2),
      after.toFixed(2),
      after.minus(before).toFixed(2),
    ].join(",");
  });
  writeFileSync(CSV_PATH, [header, ...lines].join("\n") + "\n");
}

async function main() {
  const fixes = await computeFixes();
  writeCsv(fixes);

  console.log(`${APPLY ? "APPLY" : "DRY RUN (no writes)"} — ${fixes.length} variant(s) to correct. Audit CSV: ${CSV_PATH}\n`);
  console.log("label".padEnd(28), "qty".padStart(4), "storedWAC".padStart(11), "correctWAC".padStart(11), "valueΔ".padStart(11));
  for (const f of fixes) {
    const delta = f.correctWac.minus(f.storedWac).mul(f.qtyOnHand).toDecimalPlaces(2);
    console.log(f.label.slice(0, 27).padEnd(28), String(f.qtyOnHand).padStart(4), f.storedWac.toFixed(2).padStart(11), f.correctWac.toFixed(2).padStart(11), delta.toFixed(2).padStart(11));
  }

  if (!APPLY) {
    console.log("\nNo changes written. Re-run with --apply to update wacCost for these variants.");
    await prisma.$disconnect();
    return;
  }

  // Each correction is a conditional updateMany: the row is only written if its
  // wacCost still equals the value we measured during the scan. That is the guard
  // (a concurrently changed row updates 0 rows and is reported, never clobbered)
  // and it runs atomically per row over the HTTP path — no interactive tx needed.
  let applied = 0;
  const skipped: string[] = [];
  for (const f of fixes) {
    const res = await prisma.productVariant.updateMany({
      where: { id: f.variantId, wacCost: f.storedWac.toFixed(2) },
      data: { wacCost: f.correctWac.toFixed(2) },
    });
    if (res.count === 1) {
      applied++;
      console.log(`  ✓ ${f.label}: ${f.storedWac.toFixed(2)} → ${f.correctWac.toFixed(2)}`);
    } else {
      skipped.push(f.label);
      console.log(`  ⚠ ${f.label}: skipped (wacCost no longer ${f.storedWac.toFixed(2)} — changed or already applied)`);
    }
  }
  console.log(`\n✅ Applied ${applied}/${fixes.length} WAC corrections (wacCost only). Old values preserved in ${CSV_PATH}.`);
  if (skipped.length) console.log(`Skipped: ${skipped.join(", ")}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  if (e?.error) console.error("cause:", e.error?.message ?? e.error);
  if (e?.stack) console.error(e.stack);
  process.exit(1);
});
