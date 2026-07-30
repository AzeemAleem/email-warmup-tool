-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "appPassword" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL DEFAULT 'imap.gmail.com',
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "warmupStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyTargetVolume" INTEGER NOT NULL DEFAULT 0,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarmupEvent" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyPreview" TEXT NOT NULL,
    "messageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "landedInSpam" BOOLEAN NOT NULL DEFAULT false,
    "rescuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarmupEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarmupConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "rampUpDays" INTEGER NOT NULL DEFAULT 28,
    "startVolumePerDay" INTEGER NOT NULL DEFAULT 2,
    "maxVolumePerDay" INTEGER NOT NULL DEFAULT 40,
    "minDelayBetweenSendsMs" INTEGER NOT NULL DEFAULT 180000,
    "maxDelayBetweenSendsMs" INTEGER NOT NULL DEFAULT 900000,
    "replyProbability" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "spamRescueEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activeHourStart" INTEGER NOT NULL DEFAULT 8,
    "activeHourEnd" INTEGER NOT NULL DEFAULT 20,
    "minPairCooldownHours" INTEGER NOT NULL DEFAULT 6,
    "aiProvider" TEXT NOT NULL DEFAULT 'gemini',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarmupConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "WarmupEvent_status_scheduledFor_idx" ON "WarmupEvent"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "WarmupEvent_senderId_idx" ON "WarmupEvent"("senderId");

-- CreateIndex
CREATE INDEX "WarmupEvent_receiverId_idx" ON "WarmupEvent"("receiverId");

-- CreateIndex
CREATE INDEX "WarmupEvent_messageId_idx" ON "WarmupEvent"("messageId");

-- AddForeignKey
ALTER TABLE "WarmupEvent" ADD CONSTRAINT "WarmupEvent_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarmupEvent" ADD CONSTRAINT "WarmupEvent_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
