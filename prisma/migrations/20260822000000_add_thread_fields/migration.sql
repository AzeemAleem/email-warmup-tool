-- AlterTable
ALTER TABLE "WarmupEvent" ADD COLUMN IF NOT EXISTS "threadRootId" TEXT;
ALTER TABLE "WarmupEvent" ADD COLUMN IF NOT EXISTS "threadDepth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WarmupEvent" ADD COLUMN IF NOT EXISTS "isReply" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WarmupEvent_threadRootId_idx" ON "WarmupEvent"("threadRootId");
CREATE INDEX IF NOT EXISTS "WarmupEvent_isReply_status_sentAt_idx" ON "WarmupEvent"("isReply", "status", "sentAt");
