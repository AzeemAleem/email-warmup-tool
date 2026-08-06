/**
 * SMTP send worker: BullMQ repeatable job every 5 minutes.
 * Queries QUEUED events due for sending, sends via nodemailer.
 */
import { Queue, Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../lib/crypto";
import { personalizeEmailContent, resolveDisplayName } from "../lib/personalize";
import { resolveSafetyLimits } from "../lib/safety";
import { getRedis } from "./redis";
import logger from "./logger";

const prisma = new PrismaClient();

const QUEUE_NAME = "smtp-send";
const SMTP_SEND_JOB = "process-queued-events";

// Pool of SMTP transports keyed by accountId
const transporterPool: Map<string, nodemailer.Transporter> = new Map();

function getTransporter(
  accountId: string,
  email: string,
  appPassword: string,
  smtpHost: string,
  smtpPort: number
): nodemailer.Transporter {
  if (transporterPool.has(accountId)) {
    return transporterPool.get(accountId)!;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: email,
      pass: appPassword,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 1,
  });

  transporterPool.set(accountId, transporter);
  return transporter;
}

async function countInbound(
  receiverId: string,
  since: Date
): Promise<number> {
  return prisma.warmupEvent.count({
    where: {
      receiverId,
      status: "SENT",
      sentAt: { gte: since },
    },
  });
}

async function processQueuedEvents(): Promise<void> {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const config = await prisma.warmupConfig.findUnique({
    where: { id: "singleton" },
  });
  const safety = resolveSafetyLimits(config);
  const minDelay = config?.minDelayBetweenSendsMs ?? 180000;

  // Fetch a small candidate set — never dump 50 at once
  const events = await prisma.warmupEvent.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now },
    },
    include: {
      sender: true,
      receiver: true,
    },
    orderBy: { scheduledFor: "asc" },
    take: 30,
  });

  if (events.length === 0) return;

  logger.info(`Evaluating ${events.length} queued warmup events (safety caps on)`);

  let sentThisTick = 0;
  const receiverCountsThisTick = new Map<string, number>();
  const sendersUsedThisTick = new Set<string>();

  for (const event of events) {
    if (sentThisTick >= safety.maxSendsPerTick) {
      logger.info(
        { sentThisTick, cap: safety.maxSendsPerTick },
        "Tick send cap reached — remaining stay queued"
      );
      break;
    }

    const { sender, receiver } = event;

    if (sender.status !== "ACTIVE") {
      await prisma.warmupEvent.update({
        where: { id: event.id },
        data: { status: "FAILED" },
      });
      continue;
    }

    if (sender.role === "OLD" && receiver.role === "OLD") {
      await prisma.warmupEvent.update({
        where: { id: event.id },
        data: { status: "FAILED" },
      });
      logger.info(
        { eventId: event.id, from: sender.email, to: receiver.email },
        "Skipped OLD→OLD send (pairing rule)"
      );
      continue;
    }

    // NEW accounts must not initiate independent warmup emails (only in-thread replies)
    if (sender.role === "NEW") {
      await prisma.warmupEvent.update({
        where: { id: event.id },
        data: { status: "FAILED" },
      });
      logger.info(
        { eventId: event.id, from: sender.email, to: receiver.email },
        "Skipped NEW-initiated send (NEW only replies in-thread)"
      );
      continue;
    }

    if (sendersUsedThisTick.has(sender.id)) {
      continue;
    }

    const recvCount = receiverCountsThisTick.get(receiver.id) || 0;
    if (recvCount >= safety.maxSendsToSameReceiverPerTick) {
      continue;
    }

    // Receiver hourly / daily inbound caps
    const inboundHour = await countInbound(receiver.id, hourAgo);
    if (inboundHour >= safety.maxInboundPerReceiverPerHour) {
      logger.info(
        {
          receiver: receiver.email,
          inboundHour,
          cap: safety.maxInboundPerReceiverPerHour,
        },
        "Receiver hourly inbound cap — leave queued"
      );
      continue;
    }

    const inboundDay = await countInbound(receiver.id, dayStart);
    if (inboundDay >= safety.maxInboundPerReceiverPerDay) {
      // Over daily cap: cancel leftover queue TO this receiver for today
      await prisma.warmupEvent.updateMany({
        where: {
          receiverId: receiver.id,
          status: "QUEUED",
          scheduledFor: { gte: dayStart },
        },
        data: { status: "FAILED" },
      });
      logger.warn(
        {
          receiver: receiver.email,
          inboundDay,
          cap: safety.maxInboundPerReceiverPerDay,
        },
        "Receiver daily inbound cap hit — cancelled remaining queue to this inbox"
      );
      continue;
    }

    // Minimum delay between sends from same sender
    const lastSent = await prisma.warmupEvent.findFirst({
      where: {
        senderId: sender.id,
        status: "SENT",
        sentAt: { not: null },
      },
      orderBy: { sentAt: "desc" },
    });
    if (lastSent?.sentAt) {
      const elapsed = now.getTime() - lastSent.sentAt.getTime();
      if (elapsed < minDelay) {
        continue;
      }
    }

    // Also enforce gap since last inbound to this receiver (spread arrivals)
    const lastToReceiver = await prisma.warmupEvent.findFirst({
      where: {
        receiverId: receiver.id,
        status: "SENT",
        sentAt: { not: null },
      },
      orderBy: { sentAt: "desc" },
    });
    if (lastToReceiver?.sentAt) {
      const sinceRecv = now.getTime() - lastToReceiver.sentAt.getTime();
      if (sinceRecv < safety.minGapBetweenInboundMs) {
        continue;
      }
    }

    try {
      const appPassword = decrypt(sender.appPassword);
      const transporter = getTransporter(
        sender.id,
        sender.email,
        appPassword,
        sender.smtpHost,
        sender.smtpPort
      );

      const messageId = `<warmup-${event.id}@warmup.local>`;
      const senderName = resolveDisplayName(sender.displayName, sender.email);
      const receiverName = resolveDisplayName(
        receiver.displayName,
        receiver.email
      );
      const personalized = personalizeEmailContent(
        event.subject,
        event.bodyPreview,
        senderName,
        receiverName
      );

      await transporter.sendMail({
        from: `"${senderName}" <${sender.email}>`,
        to: receiver.email,
        subject: personalized.subject,
        text: personalized.body,
        messageId,
        headers: {
          "X-Warmup-Event": event.id,
        },
      });

      await prisma.warmupEvent.update({
        where: { id: event.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId,
          subject: personalized.subject,
          bodyPreview: personalized.body,
        },
      });

      await prisma.account.update({
        where: { id: sender.id },
        data: { sentToday: { increment: 1 } },
      });

      sentThisTick++;
      sendersUsedThisTick.add(sender.id);
      receiverCountsThisTick.set(
        receiver.id,
        (receiverCountsThisTick.get(receiver.id) || 0) + 1
      );

      logger.info(
        { eventId: event.id, from: sender.email, to: receiver.email },
        "Warmup email sent"
      );
    } catch (err: unknown) {
      const error = err as Error;
      logger.error(
        { eventId: event.id, senderId: sender.id, err: error.message },
        "Failed to send warmup email"
      );

      const isAuthError =
        error.message?.includes("535") ||
        error.message?.includes("InvalidCredentials") ||
        error.message?.includes("EAUTH");
      const isRateLimitError =
        error.message?.includes("421") ||
        error.message?.includes("4.7.0") ||
        error.message?.includes("Rate limit");

      if (isAuthError || isRateLimitError) {
        await prisma.account.update({
          where: { id: sender.id },
          data: {
            status: "ERROR",
            dailyTargetVolume: 0,
            lastError: error.message,
          },
        });
        transporterPool.delete(sender.id);
        logger.warn(
          { accountId: sender.id, email: sender.email },
          "Account set to ERROR — requires manual re-activation"
        );
      }

      await prisma.warmupEvent.update({
        where: { id: event.id },
        data: { status: "FAILED" },
      });
    }
  }
}

export function startSmtpWorker(): Worker {
  const redis = getRedis();

  const queue = new Queue(QUEUE_NAME, { connection: redis });

  // Register repeatable job every 5 minutes
  queue.add(
    SMTP_SEND_JOB,
    {},
    {
      repeat: { every: 5 * 60 * 1000 }, // 5 minutes
      removeOnComplete: 10,
      removeOnFail: 20,
    }
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      if (job.name === SMTP_SEND_JOB) {
        await processQueuedEvents();
      }
    },
    {
      connection: redis,
      concurrency: 1, // Process one batch at a time
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "SMTP worker job failed");
  });

  logger.info("SMTP worker started (5-minute interval)");
  return worker;
}
