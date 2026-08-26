-- Deliverability safety columns (were in schema via db push on Neon, never migrated)
ALTER TABLE "WarmupConfig" ADD COLUMN IF NOT EXISTS "maxInboundPerReceiverPerDay" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "WarmupConfig" ADD COLUMN IF NOT EXISTS "maxInboundPerReceiverPerHour" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WarmupConfig" ADD COLUMN IF NOT EXISTS "minGapBetweenInboundMs" INTEGER NOT NULL DEFAULT 7200000;
ALTER TABLE "WarmupConfig" ADD COLUMN IF NOT EXISTS "maxSendsPerTick" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WarmupConfig" ADD COLUMN IF NOT EXISTS "maxSendsToSameReceiverPerTick" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "WarmupConfig" ADD COLUMN IF NOT EXISTS "maxOldDailySendsWhenFewNew" INTEGER NOT NULL DEFAULT 3;
