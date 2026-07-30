/**
 * SMTP send worker: BullMQ repeatable job every 5 minutes.
 * Queries QUEUED events due for sending, sends via nodemailer.
 */
import { Queue, Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../lib/crypto";
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

async function processQueuedEvents(): Promise<void> {
  const now = new Date();

  // Get all QUEUED events due now
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
    take: 50, // Process up to 50 per tick
  });

  if (events.length === 0) return;

  logger.info(`Processing ${events.length} queued warmup events`);

  for (const event of events) {
    const { sender, receiver } = event;

    // Skip if sender account is not active
    if (sender.status !== "ACTIVE") {
      await prisma.warmupEvent.update({
        where: { id: event.id },
        data: { status: "FAILED" },
      });
      continue;
    }

    // Enforce minimum delay: check last send from this account
    const lastSent = await prisma.warmupEvent.findFirst({
      where: {
        senderId: sender.id,
        status: "SENT",
        sentAt: { not: null },
      },
      orderBy: { sentAt: "desc" },
    });

    const config = await prisma.warmupConfig.findUnique({ where: { id: "singleton" } });
    if (config && lastSent?.sentAt) {
      const elapsed = now.getTime() - lastSent.sentAt.getTime();
      if (elapsed < config.minDelayBetweenSendsMs) {
        logger.debug(
          { accountId: sender.id, elapsed },
          "Skipping send: minimum delay not elapsed"
        );
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

      await transporter.sendMail({
        from: `"${sender.displayName || sender.email}" <${sender.email}>`,
        to: receiver.email,
        subject: event.subject,
        text: event.bodyPreview,
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
        },
      });

      await prisma.account.update({
        where: { id: sender.id },
        data: { sentToday: { increment: 1 } },
      });

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

      // Check if it's an auth/rate-limit error
      const isAuthError =
        error.message?.includes("535") ||
        error.message?.includes("InvalidCredentials") ||
        error.message?.includes("EAUTH");
      const isRateLimitError =
        error.message?.includes("421") ||
        error.message?.includes("4.7.0") ||
        error.message?.includes("Rate limit");

      if (isAuthError || isRateLimitError) {
        // Set account to ERROR, require manual re-activation
        await prisma.account.update({
          where: { id: sender.id },
          data: {
            status: "ERROR",
            dailyTargetVolume: 0,
            lastError: error.message,
          },
        });
        // Remove transporter from pool
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
