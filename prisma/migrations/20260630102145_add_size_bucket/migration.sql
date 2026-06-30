-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "sizeBucket" TEXT;

-- CreateIndex
CREATE INDEX "ProductVariant_sizeBucket_idx" ON "ProductVariant"("sizeBucket");
