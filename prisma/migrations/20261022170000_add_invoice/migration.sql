-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "quoteNo" TEXT NOT NULL,
    "clientName" TEXT NOT NULL DEFAULT '',
    "clientEmail" TEXT NOT NULL DEFAULT '',
    "orderTitle" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" INTEGER,
    "unitPrice" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_quoteNo_idx" ON "Invoice"("quoteNo");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_clientName_idx" ON "Invoice"("clientName");
