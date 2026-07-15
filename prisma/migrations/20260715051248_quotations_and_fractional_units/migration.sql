-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "quotationFooter" TEXT NOT NULL DEFAULT 'Yeh quotation hai — bill nahi. Prices sirf validity tak fixed hain.',
ADD COLUMN     "quotationPrefix" TEXT NOT NULL DEFAULT 'QT',
ADD COLUMN     "quotationValidityDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "quotationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "isFractional" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'ACTIVE',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "convertedSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT,
    "cataloguePrice" DECIMAL(12,2),
    "soldPrice" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "isOpenItem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quotation_businessId_createdAt_idx" ON "Quotation"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Quotation_businessId_status_idx" ON "Quotation"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_businessId_quotationNumber_key" ON "Quotation"("businessId", "quotationNumber");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing business needs a QUOTATION counter — the
-- gapless-numbering lock assumes the row exists (COUNTER_MISSING otherwise).
INSERT INTO "DocumentCounter" ("id", "businessId", "key", "nextNumber")
SELECT 'qc_' || substr(md5(random()::text || b."id"), 1, 22), b."id", 'QUOTATION', 1
FROM "Business" b
WHERE NOT EXISTS (
  SELECT 1 FROM "DocumentCounter" dc
  WHERE dc."businessId" = b."id" AND dc."key" = 'QUOTATION'
);
