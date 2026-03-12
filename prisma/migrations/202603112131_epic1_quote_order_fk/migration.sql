-- CreateIndex
CREATE UNIQUE INDEX "Quote_orderId_key" ON "Quote"("orderId");

-- AddForeignKey
ALTER TABLE "Quote"
ADD CONSTRAINT "Quote_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
