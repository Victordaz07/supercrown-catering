-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'APPLIED'
);

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM (
  'ITEM_SHORTAGE',
  'ITEM_DAMAGE',
  'PRICE_ERROR',
  'LATE_DELIVERY',
  'OTHER'
);

-- CreateTable
CREATE TABLE "AdjustmentRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "deliveryReportId" TEXT,
    "type" "AdjustmentType" NOT NULL,
    "description" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "appliedAt" TIMESTAMP(3),
    "appliedBy" TEXT,
    "invoiceAdjustmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdjustmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdjustmentRequest_orderId_status_idx" ON "AdjustmentRequest"("orderId", "status");

-- CreateIndex
CREATE INDEX "AdjustmentRequest_invoiceId_idx" ON "AdjustmentRequest"("invoiceId");

-- AddForeignKey
ALTER TABLE "AdjustmentRequest" ADD CONSTRAINT "AdjustmentRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentRequest" ADD CONSTRAINT "AdjustmentRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentRequest" ADD CONSTRAINT "AdjustmentRequest_deliveryReportId_fkey" FOREIGN KEY ("deliveryReportId") REFERENCES "DeliveryReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentRequest" ADD CONSTRAINT "AdjustmentRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentRequest" ADD CONSTRAINT "AdjustmentRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentRequest" ADD CONSTRAINT "AdjustmentRequest_appliedBy_fkey" FOREIGN KEY ("appliedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
