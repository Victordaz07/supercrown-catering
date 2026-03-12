-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "sourceQuoteId" TEXT,
ADD COLUMN "priceSnapshot" JSONB,
ADD COLUMN "pricingLockedAt" TIMESTAMP(3),
ADD COLUMN "pricingLockedBy" TEXT,
ADD COLUMN "stateMachineV" INTEGER DEFAULT 1;
