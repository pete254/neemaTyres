-- Deduplicate customer names before adding unique constraint
-- (keeps the oldest record for each name)
DELETE FROM "Customer" c1
USING "Customer" c2
WHERE c1."createdAt" > c2."createdAt"
  AND c1."name" = c2."name";

-- Drop the old plain index and add a unique constraint (also serves as index)
DROP INDEX IF EXISTS "Customer_name_idx";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_name_key" UNIQUE ("name");
