/**
 * Main worker entry point.
 * Starts: daily cron planner, SMTP send worker, IMAP check worker.
 * Run independently from Next.js: `npm run worker`
 */
import * as dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { startSmtpWorker } from "./smtp-worker";
import { startImapWorker } from "./imap-worker";
import { runDailyPlanner } from "./daily-planner";
import logger from "./logger";

async function main() {
  logger.info("Email warmup worker process starting...");

  // Validate required env vars (Redis/BullMQ no longer used — Contabo timers only)
  const requiredEnvVars = ["DATABASE_URL", "ENCRYPTION_KEY"];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Run the daily planner immediately on startup if needed
  const now = new Date();
  const hour = now.getHours();

  // If starting during business hours and no events exist for today, run planner
  if (hour >= 6 && hour <= 22) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayEventCount = await prisma.warmupEvent.count({
        where: {
          scheduledFor: { gte: todayStart, lte: todayEnd },
          status: "QUEUED",
        },
      });
      await prisma.$disconnect();

      if (todayEventCount === 0) {
        logger.info("No events scheduled for today, running initial daily planner...");
        await runDailyPlanner();
      } else {
        logger.info(`Found ${todayEventCount} events already scheduled for today`);
      }
    } catch (err) {
      logger.error({ err }, "Failed to check/run initial daily plan");
    }
  }

  // Schedule daily planner at midnight
  cron.schedule("0 0 * * *", async () => {
    logger.info("Midnight cron: running daily planner");
    try {
      await runDailyPlanner();
    } catch (err) {
      logger.error({ err }, "Daily planner cron failed");
    }
  });

  // Start interval workers (no Redis)
  const smtpWorker = startSmtpWorker();
  const imapWorker = startImapWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Received shutdown signal");
    await smtpWorker.close();
    await imapWorker.close();
    logger.info("Workers closed. Exiting.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info("All workers running (SMTP 5m / IMAP 7m timers)...");
}

main().catch((err) => {
  logger.error({ err }, "Fatal error in worker process");
  process.exit(1);
});
