-- AlterTable
ALTER TABLE "User" ADD COLUMN "notificationPrefs" JSONB;

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "quoteId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "resendId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_orderId_idx" ON "EmailLog"("orderId");

-- CreateIndex
CREATE INDEX "EmailLog_quoteId_idx" ON "EmailLog"("quoteId");

-- CreateIndex
CREATE INDEX "EmailLog_recipient_sentAt_idx" ON "EmailLog"("recipient", "sentAt");
