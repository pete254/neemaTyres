/**
 * One-off: correct the 17.5 Linglong Small purchase of 2026-07-01 whose unit
 * cost was entered as 1,500 (a missing-zero typo) — the same supplier billed
 * 15,000 eight days later. CASH terms, so there is no supplier-ledger entry to
 * reconcile. Updates unitCost + lineTotal on that one purchase line only, guarded
 * on the current (wrong) value so it can't touch anything unexpected.
 *
 *   Dry run:  npx tsx --env-file=.env scripts/fix-typo-purchase.ts
 *   Apply:    npx tsx --env-file=.env scripts/fix-typo-purchase.ts --apply
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

const APPLY = process.argv.includes("--apply");
const OLD = "1500";
const NEW_UNIT = "15000";
const NEW_TOTAL = "30000";

async function main() {
  const v = await prisma.productVariant.findFirstOrThrow({
    where: { sizeCanonical: "17.5", subLabel: "Small", brand: { name: "Linglong" } },
  });
  const line = await prisma.purchaseLine.findFirstOrThrow({
    where: { variantId: v.id, unitCost: OLD, purchase: { date: new Date("2026-07-01") } },
    include: { purchase: { select: { date: true, terms: true } } },
  });
  console.log(`Target line ${line.id}: ${line.purchase.date.toISOString().slice(0, 10)} qty ${line.qty} @ ${line.unitCost.toString()} = ${line.lineTotal.toString()} [${line.purchase.terms}]`);
  console.log(`Would set: unitCost ${OLD} -> ${NEW_UNIT}, lineTotal ${line.lineTotal.toString()} -> ${NEW_TOTAL}`);

  if (!APPLY) {
    console.log("\nDRY RUN — no changes written. Re-run with --apply.");
    await prisma.$disconnect();
    return;
  }

  const res = await prisma.purchaseLine.updateMany({
    where: { id: line.id, unitCost: OLD }, // guard: still the wrong value
    data: { unitCost: NEW_UNIT, lineTotal: NEW_TOTAL },
  });
  console.log(res.count === 1 ? "\n✅ Purchase line corrected (1,500 -> 15,000)." : "\n⚠ No row updated (value changed since read).");
  await prisma.$disconnect();
}

main().catch((e) => { console.error("ERROR:", e?.message ?? e); process.exit(1); });
