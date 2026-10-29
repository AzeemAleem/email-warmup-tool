-- CreateTable: Calculation
CREATE TABLE "Calculation" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "label"     TEXT,
    "snapshot"  JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calculation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Calculation_projectId_idx" ON "Calculation"("projectId");
CREATE INDEX "Calculation_type_idx"      ON "Calculation"("type");
CREATE INDEX "Calculation_createdAt_idx" ON "Calculation"("createdAt");

ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Invoice — add projectId (nullable)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

CREATE INDEX IF NOT EXISTS "Invoice_projectId_idx" ON "Invoice"("projectId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
