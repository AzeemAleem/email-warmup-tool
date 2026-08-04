/**
 * One-shot: fail leftover QUEUED events for today, then rebuild today's plan
 * with current pairing rules (OLD → NEW only, personalized names).
 *
 * Usage on Contabo:
 *   npx ts-node --project tsconfig.worker.json src/worker/rebuild-today-plan.ts
 */
import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { runDailyPlanner } from "./daily-planner";
import logger from "./logger";

async function main() {
  const prisma = new PrismaClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  try {
    const cancelled = await prisma.warmupEvent.updateMany({
      where: {
        status: "QUEUED",
        scheduledFor: { gte: todayStart, lte: todayEnd },
      },
      data: { status: "FAILED" },
    });

    logger.info(
      { cancelled: cancelled.count },
      "Cancelled leftover QUEUED events for today"
    );

    await runDailyPlanner();
    logger.info("Today's plan rebuilt successfully");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  logger.error({ err }, "rebuild-today-plan failed");
  process.exit(1);
});
