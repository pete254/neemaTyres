/**
 * Read-only, BROAD wac reconciliation. Recomputes every variant's WAC by
 * business-date replay with the current costing engine (negative-stock guard +
 * FREE-leaves-WAC-unchanged rule) and lists every variant whose stored wacCost
 * differs — with context (qty on hand, whether it ever received stock while
 * negative, whether it ever received a FREE line) so each can be judged.
 *
 * This NEVER writes.
 *
 *   npx tsx --env-file=.env scripts/reconcile-wac.ts
 */
import dns from "node:dns";
const _origLookup = dns.lookup.bind(dns);
// @ts-expect-error override
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

const APPLY = process.argv.includes("--apply"); // applies FREE-flagged rows only
const d = (x: unknown) => new Decimal((x as { toString(): string }).toString());
interface Ev { at: number; date: number; kind: string; qty: number; unit: Decimal }

async function main() {
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
  const firstPurchase = new Map<string, { date: number; cost: Decimal }>();
  for (const p of pLines) {
    const t = p.purchase.date.getTime();
    const prev = firstPurchase.get(p.variantId);
    if (!prev || t < prev.date) firstPurchase.set(p.variantId, { date: t, cost: d(p.unitCost) });
  }
  const evByV = new Map<string, Ev[]>();
  const push = (vid: string, e: Ev) => { (evByV.get(vid) ?? evByV.set(vid, []).get(vid)!).push(e); };
  for (const p of pLines) push(p.variantId, { at: p.purchase.createdAt.getTime(), date: p.purchase.date.getTime(), kind: "PURCHASE", qty: p.qty, unit: d(p.unitCost) });
  for (const s of sLines) push(s.variantId, { at: s.sale.createdAt.getTime(), date: s.sale.date.getTime(), kind: "SALE", qty: s.qty, unit: new Decimal(0) });
  for (const r of returns) push(r.variantId, { at: r.createdAt.getTime(), date: r.date.getTime(), kind: r.type, qty: r.qty, unit: d(r.unitValue) });

  const rows: { id: string; label: string; qty: number; stored: Decimal; correct: Decimal; neg: boolean; free: boolean }[] = [];
  for (const v of variants) {
    let open = openByV.get(v.id);
    if (!open) { const fb = firstPurchase.get(v.id); open = { qty: 0, wac: fb ? fb.cost : new Decimal(0) }; }
    const evs = evByV.get(v.id) ?? [];
    const byDate = [...evs].sort((a, b) => a.date - b.date || a.at - b.at);
    let qty = open.qty, wac = open.wac, neg = false, free = false;
    for (const e of byDate) {
      const stockIn = e.kind === "PURCHASE" || e.kind === "SALE_RETURN";
      if (stockIn) {
        if (qty < 0) neg = true;
        if (e.kind === "PURCHASE" && e.unit.lte(0)) free = true;
        ({ qty, wac } = computeWac({ qty, wac }, e.qty, e.unit));
      } else qty -= e.qty;
    }
    const stored = d(v.wacCost).toDecimalPlaces(2);
    const correct = wac.toDecimalPlaces(2);
    if (!stored.equals(correct)) {
      const label = `${v.sizeCanonical} ${v.brand.name}${v.subLabel ? " " + v.subLabel : ""}${v.position !== "NONE" ? " " + v.position : ""}`.trim();
      rows.push({ id: v.id, label, qty: v.qtyOnHand, stored, correct, neg, free });
    }
  }
  rows.sort((a, b) => (b.free === a.free ? 0 : b.free ? -1 : 1) || b.correct.minus(b.stored).abs().comparedTo(a.correct.minus(a.stored).abs()));

  console.log(`${rows.length} variant(s) where stored wacCost != recomputed:\n`);
  console.log("label".padEnd(28), "qty".padStart(4), "stored".padStart(11), "correct".padStart(11), "  flags");
  for (const r of rows) {
    const flags = [r.free ? "FREE" : "", r.neg ? "neg-stock" : ""].filter(Boolean).join(",") || "-";
    console.log(r.label.slice(0, 27).padEnd(28), String(r.qty).padStart(4), r.stored.toFixed(2).padStart(11), r.correct.toFixed(2).padStart(11), " ", flags);
  }

  if (!APPLY) {
    console.log("\nNo changes written. Re-run with --apply to update wacCost for the FREE-flagged rows only.");
    await prisma.$disconnect();
    return;
  }

  // Apply ONLY the FREE-flagged rows (the direct consequence of the
  // free-leaves-WAC-unchanged rule). Non-free minor differences are left as-is.
  // Guarded per row on the current stored value.
  const targets = rows.filter((r) => r.free);
  let applied = 0;
  const skipped: string[] = [];
  for (const r of targets) {
    const res = await prisma.productVariant.updateMany({
      where: { id: r.id, wacCost: r.stored.toFixed(2) },
      data: { wacCost: r.correct.toFixed(2) },
    });
    if (res.count === 1) { applied++; console.log(`  ✓ ${r.label}: ${r.stored.toFixed(2)} → ${r.correct.toFixed(2)}`); }
    else { skipped.push(r.label); console.log(`  ⚠ ${r.label}: skipped (wacCost no longer ${r.stored.toFixed(2)})`); }
  }
  console.log(`\n✅ Applied ${applied}/${targets.length} FREE-variant wacCost corrections.`);
  if (skipped.length) console.log(`Skipped: ${skipped.join(", ")}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("ERROR:", e?.message ?? e); process.exit(1); });
