/**
 * Repair supplier ledgers:
 *   1. Remove duplicate "Opening balance (carried forward)" rows (a re-seed can
 *      create more than one, double-counting the opening payable).
 *   2. Recompute every entry's runningBalance in chronological order so stale
 *      balances left by out-of-order / edited postings are corrected.
 *
 * Dry-run by default. Apply with:  npx tsx scripts/fix-supplier-ledger.ts --apply
 */
import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import Decimal from "decimal.js";

neonConfig.webSocketConstructor = WebSocket as unknown as typeof neonConfig.webSocketConstructor;
neonConfig.poolQueryViaFetch = true;

const APPLY = process.argv.includes("--apply");
const OPENING_DESC = "Opening balance (carried forward)";

async function main() {
  const { prisma } = await import("@/lib/prisma");

  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  console.log(`${APPLY ? "APPLYING" : "DRY-RUN"} — ${suppliers.length} supplier(s)\n`);

  for (const supplier of suppliers) {
    const entries = await prisma.ledgerEntry.findMany({
      where: { supplierId: supplier.id },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });
    if (entries.length === 0) continue;

    // 1) Dedupe opening rows — keep the first, drop the rest.
    const openings = entries.filter((e) => e.description === OPENING_DESC);
    const dupeIds = openings.slice(1).map((e) => e.id);
    if (dupeIds.length > 0) {
      console.log(
        `  ${supplier.name}: removing ${dupeIds.length} duplicate opening row(s) ` +
          `(KES ${openings[0].debit.toString()} each)`
      );
      if (APPLY) {
        await prisma.ledgerEntry.deleteMany({ where: { id: { in: dupeIds } } });
      }
    }

    // 2) Recompute running balances in order over what remains.
    const remaining = entries.filter((e) => !dupeIds.includes(e.id));
    let balance = new Decimal(0);
    let changed = 0;
    for (const e of remaining) {
      balance = balance.plus(e.debit.toString()).minus(e.credit.toString());
      const corrected = balance.toDecimalPlaces(2);
      if (!corrected.equals(new Decimal(e.runningBalance.toString()))) {
        changed++;
        if (APPLY) {
          await prisma.ledgerEntry.update({
            where: { id: e.id },
            data: { runningBalance: corrected },
          });
        }
      }
    }

    if (dupeIds.length > 0 || changed > 0) {
      console.log(
        `  ${supplier.name}: ${changed} balance(s) corrected → final KES ${balance.toDecimalPlaces(2).toString()}`
      );
    }
  }

  console.log(`\nDone.${APPLY ? "" : "  Re-run with --apply to write changes."}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
