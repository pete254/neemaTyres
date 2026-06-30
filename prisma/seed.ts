/**
 * Kwambira Tyres — database seed
 * Opening snapshot as at 25 June 2026.
 *
 * Seeds: a system User, Brands, ProductVariants (with opening stock + WAC cost),
 * an OpeningBalanceEntry(STOCK) per variant, Customers + OpeningBalanceEntry(DEBTOR),
 * Supplier (Neema) + OpeningBalanceEntry(SUPPLIER) + opening LedgerEntry,
 * and a Period row tagging the snapshot.
 *
 * Run with the DIRECT (non-pooled) Neon URL:
 *   DATABASE_URL=$DIRECT_URL npx tsx prisma/seed.ts
 * or wire it into package.json "prisma": { "seed": "tsx prisma/seed.ts" } and run `npx prisma db seed`.
 *
 * Idempotency: uses upserts on natural keys where possible. Re-running will not
 * duplicate Brands/Suppliers/Users. Variants are matched on (sizeCanonical, brand,
 * position, subLabel). OpeningBalanceEntry rows are cleared by snapshotTag first
 * so re-seeding the snapshot is clean.
 *
 * NOTE on size buckets: this seed writes the TECHNICAL size to `sizeCanonical`
 * (e.g. "315/80R22.5") and the shop "size bucket" used for the size-first filter
 * to `sizeBucket` (e.g. "22.5"). This requires the `sizeBucket` field to exist on
 * ProductVariant — add it and migrate BEFORE running this seed (see the separate
 * "add size bucket" instructions). The SizeAlias rows mapping technical→bucket are
 * still seeded as a harmless fallback; the UI should read `sizeBucket` directly.
 */

import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, Position, OpeningBalanceKind } from "../app/generated/prisma/client";
import { VARIANTS, DEBTORS, SUPPLIERS, SNAPSHOT_TAG, SNAPSHOT_DATE } from "./seed-data";

const connectionString = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]!;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// The seed runs as a system user so every recordedById is valid.
const SYSTEM_USER = {
  name: "System (seed)",
  email: "system@kwambira.local",
  // Placeholder hash — replace with a real hash or disable login for this user.
  passwordHash: "SEED_USER_NO_LOGIN",
};

async function main() {
  console.log("Seeding Kwambira opening snapshot:", SNAPSHOT_TAG);

  // 1) System user
  const user = await prisma.user.upsert({
    where: { email: SYSTEM_USER.email },
    update: {},
    create: SYSTEM_USER,
  });

  // 2) Clear any prior opening-balance rows for this snapshot (clean re-seed)
  await prisma.openingBalanceEntry.deleteMany({ where: { snapshotTag: SNAPSHOT_TAG } });

  // 3) Brands (unique by name)
  const brandNames = Array.from(new Set(VARIANTS.map((v) => v.brand)));
  const brandByName = new Map<string, string>();
  for (const name of brandNames) {
    const b = await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    brandByName.set(name, b.id);
  }
  console.log(`  brands: ${brandByName.size}`);

  // 4) SizeAlias: technical size → bucket (so UI can group without a schema change)
  const aliasPairs = new Map<string, string>(); // alias(technical) -> bucket
  for (const v of VARIANTS) aliasPairs.set(v.sizeCanonical, v.sizeBucket);
  for (const [alias, bucket] of aliasPairs) {
    await prisma.sizeAlias.upsert({
      where: { alias },
      update: { sizeCanonical: bucket },
      create: { alias, sizeCanonical: bucket },
    });
  }
  console.log(`  size aliases: ${aliasPairs.size}`);

  // 5) Variants + opening stock entries
  let stockEntries = 0;
  for (const v of VARIANTS) {
    const brandId = brandByName.get(v.brand)!;
    const position = v.position as Position;

    // Match on the composite natural key. subLabel NULL is distinct in Postgres,
    // so we find-or-create manually rather than upsert on the @@unique.
    let variant = await prisma.productVariant.findFirst({
      where: {
        sizeCanonical: v.sizeCanonical,
        brandId,
        position,
        subLabel: v.subLabel ?? null,
      },
    });

    if (!variant) {
      variant = await prisma.productVariant.create({
        data: {
          sizeCanonical: v.sizeCanonical, // technical size, e.g. "315/80R22.5"
          sizeBucket: v.sizeBucket,       // shop bucket for the size-first filter, e.g. "22.5"
          brandId,
          position,
          subLabel: v.subLabel ?? null,
          referenceSellPrice: v.referenceSellPrice ?? null,
          wacCost: v.wacCost,
          qtyOnHand: v.qtyOnHand,
          isOffInventory: false,
          recordedById: user.id,
        },
      });
    } else {
      variant = await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          sizeBucket: v.sizeBucket, // backfill bucket on re-run
          referenceSellPrice: v.referenceSellPrice ?? null,
          wacCost: v.wacCost,
          qtyOnHand: v.qtyOnHand,
        },
      });
    }

    // Explicit opening-balance STOCK entry (auditable seed origin)
    await prisma.openingBalanceEntry.create({
      data: {
        kind: OpeningBalanceKind.STOCK,
        variantId: variant.id,
        qty: v.qtyOnHand,
        unitCost: v.wacCost,
        snapshotTag: SNAPSHOT_TAG,
        recordedById: user.id,
      },
    });
    stockEntries++;
  }
  console.log(`  variants + stock entries: ${stockEntries}`);

  // 6) Customers + opening debtor balances
  let debtorEntries = 0;
  for (const d of DEBTORS) {
    // Customer.name is not unique in the schema; find-or-create by name.
    let customer = await prisma.customer.findFirst({ where: { name: d.name } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: d.name, recordedById: user.id },
      });
    }
    await prisma.openingBalanceEntry.create({
      data: {
        kind: OpeningBalanceKind.DEBTOR,
        customerId: customer.id,
        amount: d.amount,
        asOfDate: SNAPSHOT_DATE,
        note: "Opening debtor balance as at 25 Jun 2026",
        snapshotTag: SNAPSHOT_TAG,
        recordedById: user.id,
      },
    });
    debtorEntries++;
  }
  console.log(`  debtors: ${debtorEntries}`);

  // 7) Suppliers + opening balance + opening ledger line
  for (const s of SUPPLIERS) {
    const supplier = await prisma.supplier.upsert({
      where: { name: s.name },
      update: { openingBalance: s.openingBalance },
      create: { name: s.name, openingBalance: s.openingBalance },
    });

    await prisma.openingBalanceEntry.create({
      data: {
        kind: OpeningBalanceKind.SUPPLIER,
        supplierId: supplier.id,
        amount: s.openingBalance,
        note: "Opening supplier payable as at 25 Jun 2026",
        snapshotTag: SNAPSHOT_TAG,
        recordedById: user.id,
      },
    });

    // Opening ledger line so the running statement starts at the right balance.
    await prisma.ledgerEntry.create({
      data: {
        supplierId: supplier.id,
        date: SNAPSHOT_DATE,
        description: "Opening balance (carried forward)",
        debit: s.openingBalance,
        credit: 0,
        runningBalance: s.openingBalance,
      },
    });
  }
  console.log(`  suppliers: ${SUPPLIERS.length}`);

  // 8) Period row tagging this snapshot as the opening position
  await prisma.period.create({
    data: {
      name: "Opening — 25 Jun 2026",
      startAt: SNAPSHOT_DATE,
      endAt: SNAPSHOT_DATE,
      openingSnapshotId: SNAPSHOT_TAG,
    },
  });

  // Summary
  const stockValue = VARIANTS.reduce((s, v) => s + v.wacCost * v.qtyOnHand, 0);
  const debtTotal = DEBTORS.reduce((s, d) => s + d.amount, 0);
  console.log("Done.");
  console.log(`  Stock value at cost: KES ${stockValue.toLocaleString()}`);
  console.log(`  Debtor total:        KES ${debtTotal.toLocaleString()}`);
  console.log(`  Neema payable:       KES ${SUPPLIERS[0].openingBalance.toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
