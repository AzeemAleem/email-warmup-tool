/**
 * EMERGENCY: stop all outbound warmup immediately.
 * Cancels every QUEUED event so George (and others) stop receiving bursts.
 *
 * Contabo:
 *   npm run worker:emergency-stop
 *   pm2 restart email-warmup-worker
 */
import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import logger from "./logger";

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.warmupEvent.updateMany({
      where: { status: "QUEUED" },
      data: { status: "FAILED" },
    });

    // Zero today's targets so UI reflects pause until next rebuild
    await prisma.account.updateMany({
      where: { status: "ACTIVE" },
      data: { dailyTargetVolume: 0 },
    });

    logger.warn(
      { cancelled: result.count },
      "EMERGENCY STOP: all QUEUED warmup events cancelled, daily targets zeroed"
    );
    logger.info(
      "Next: deploy safety caps, then run `npm run worker:rebuild-plan` only when ready for a slow plan"
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
