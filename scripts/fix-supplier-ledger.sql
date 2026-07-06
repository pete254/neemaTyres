-- Repair supplier ledgers.
--   1. Remove duplicate "Opening balance (carried forward)" rows (a re-seed
--      created more than one, double-counting the opening payable).
--   2. Recompute every entry's runningBalance in chronological order so stale
--      balances left by out-of-order / edited postings are corrected.
--
-- Identifiers are quoted because Prisma creates PascalCase / camelCase names.
-- Run the two PREVIEW queries first; then run the APPLY transaction.

-- ─── PREVIEW 1: duplicate opening rows that will be deleted ──────────────────
SELECT id, "supplierId", date, debit, "runningBalance"
FROM (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY "supplierId" ORDER BY id) AS rn
  FROM "LedgerEntry"
  WHERE description = 'Opening balance (carried forward)'
) d
WHERE rn > 1;

-- ─── PREVIEW 2: current vs corrected running balance (after de-dup) ──────────
WITH deduped AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY "supplierId" ORDER BY id) AS opening_rn
  FROM "LedgerEntry"
), kept AS (
  SELECT * FROM deduped
  WHERE description <> 'Opening balance (carried forward)' OR opening_rn = 1
)
SELECT id, "supplierId", date, description, debit, credit,
       "runningBalance" AS current_balance,
       SUM(debit - credit) OVER (
         PARTITION BY "supplierId"
         ORDER BY date ASC, id ASC
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS corrected_balance
FROM kept
ORDER BY "supplierId", date, id;

-- ─── APPLY: run inside a transaction, review, then COMMIT ────────────────────
BEGIN;

-- 1) Delete duplicate opening rows (keep the earliest per supplier).
DELETE FROM "LedgerEntry" le
USING (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "supplierId" ORDER BY id) AS rn
  FROM "LedgerEntry"
  WHERE description = 'Opening balance (carried forward)'
) dup
WHERE le.id = dup.id AND dup.rn > 1;

-- 2) Recompute running balances in [date asc, id asc] order.
UPDATE "LedgerEntry" le
SET "runningBalance" = calc.rb
FROM (
  SELECT id,
         SUM(debit - credit) OVER (
           PARTITION BY "supplierId"
           ORDER BY date ASC, id ASC
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) AS rb
  FROM "LedgerEntry"
) calc
WHERE le.id = calc.id
  AND le."runningBalance" IS DISTINCT FROM calc.rb;

-- Verify the final balance per supplier before committing:
SELECT "supplierId",
       (SELECT "runningBalance" FROM "LedgerEntry" x
        WHERE x."supplierId" = l."supplierId"
        ORDER BY date DESC, id DESC LIMIT 1) AS final_balance
FROM "LedgerEntry" l
GROUP BY "supplierId";

COMMIT;
-- If anything looks wrong before COMMIT, run  ROLLBACK;  instead.
