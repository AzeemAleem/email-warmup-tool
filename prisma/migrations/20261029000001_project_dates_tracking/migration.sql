-- AlterTable: add trackingId, startDate, deadline to Project
ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "trackingId" TEXT,
  ADD COLUMN IF NOT EXISTS "startDate"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deadline"   TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_trackingId_idx" ON "Project"("trackingId");
