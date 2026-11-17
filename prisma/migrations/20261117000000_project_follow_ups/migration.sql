-- AlterTable: Project follow-up cadence fields
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "followUpStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "followUpStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "nextFollowUpOn" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastFollowUpAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Project_followUpStatus_idx" ON "Project"("followUpStatus");
CREATE INDEX IF NOT EXISTS "Project_nextFollowUpOn_idx" ON "Project"("nextFollowUpOn");

-- CreateTable: ProjectFollowUp
CREATE TABLE IF NOT EXISTS "ProjectFollowUp" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectFollowUp_projectId_idx" ON "ProjectFollowUp"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectFollowUp_doneAt_idx" ON "ProjectFollowUp"("doneAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectFollowUp_projectId_fkey'
  ) THEN
    ALTER TABLE "ProjectFollowUp"
      ADD CONSTRAINT "ProjectFollowUp_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
