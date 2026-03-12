-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'DELIVERED',
  'ADJUSTED',
  'PAID',
  'OVERDUE',
  'VOID',
  'REFUNDED'
);

-- AlterTable: Convert status from String to InvoiceStatus
ALTER TABLE "Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Invoice"
ALTER COLUMN "status" TYPE "InvoiceStatus"
USING (
  CASE "status"
    WHEN 'DRAFT' THEN 'DRAFT'
    WHEN 'SENT' THEN 'SENT'
    WHEN 'DELIVERED' THEN 'DELIVERED'
    WHEN 'ADJUSTED' THEN 'ADJUSTED'
    WHEN 'PAID' THEN 'PAID'
    WHEN 'OVERDUE' THEN 'OVERDUE'
    WHEN 'VOID' THEN 'VOID'
    WHEN 'REFUNDED' THEN 'REFUNDED'
    ELSE 'DRAFT'
  END
)::"InvoiceStatus";
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Add Stripe fields
ALTER TABLE "Invoice" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "receiptUrl" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "paidAmount" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripePaymentIntentId_key" ON "Invoice"("stripePaymentIntentId");
