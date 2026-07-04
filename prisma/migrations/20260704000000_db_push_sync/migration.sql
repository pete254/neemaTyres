-- Sync db push changes: invoiceNo, quotationNo, user name unique, email optional

ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "invoiceNo" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_invoiceNo_key" ON "Sale"("invoiceNo");

ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "quotationNo" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_quotationNo_key" ON "Quotation"("quotationNo");

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_name_key" ON "User"("name");
