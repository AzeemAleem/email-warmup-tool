-- Project: deal type + shipping address
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "dealType" TEXT NOT NULL DEFAULT 'QUOTATION';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "shippingAddress" TEXT;

CREATE INDEX IF NOT EXISTS "Project_dealType_idx" ON "Project"("dealType");

-- ActualExpense table
CREATE TABLE IF NOT EXISTS "ActualExpense" (
    "id"                 TEXT NOT NULL,
    "projectId"          TEXT NOT NULL,
    "totalAmountUsd"     DOUBLE PRECISION,
    "deductionUsd"       DOUBLE PRECISION,
    "remainingAmountUsd" DOUBLE PRECISION,
    "usdRate"            DOUBLE PRECISION NOT NULL DEFAULT 280,
    "productionCostPkr"  DOUBLE PRECISION,
    "shippingCostPkr"    DOUBLE PRECISION,
    "totalWeightKg"      DOUBLE PRECISION,
    "shippingPerKgPkr"   DOUBLE PRECISION,
    "shipToCountry"      TEXT,
    "totalExpensePkr"    DOUBLE PRECISION,
    "profitPkr"          DOUBLE PRECISION,
    "paymentMethod"      TEXT,
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualExpense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ActualExpense_projectId_key" ON "ActualExpense"("projectId");

ALTER TABLE "ActualExpense" DROP CONSTRAINT IF EXISTS "ActualExpense_projectId_fkey";
ALTER TABLE "ActualExpense" ADD CONSTRAINT "ActualExpense_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
