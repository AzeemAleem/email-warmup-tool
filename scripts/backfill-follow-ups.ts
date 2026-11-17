/**
 * One-time backfill: set nextFollowUpOn for open projects that have none.
 * Run: npx ts-node --transpile-only scripts/backfill-follow-ups.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  computeNextFollowUpOn,
  FOLLOW_UP_MAX_STEP,
} from "../src/lib/followUp/schedule";

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { nextFollowUpOn: null, followUpStatus: "ACTIVE" },
        {
          followUpStatus: "ACTIVE",
          followUpStep: 0,
          nextFollowUpOn: null,
        },
      ],
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    select: {
      id: true,
      createdAt: true,
      followUpStep: true,
      lastFollowUpAt: true,
      followUpStatus: true,
      nextFollowUpOn: true,
    },
  });

  let updated = 0;
  for (const p of projects) {
    if (p.followUpStep >= FOLLOW_UP_MAX_STEP) {
      await prisma.project.update({
        where: { id: p.id },
        data: { followUpStatus: "DEAD", nextFollowUpOn: null },
      });
      updated++;
      continue;
    }
    if (p.nextFollowUpOn) continue;

    const next = computeNextFollowUpOn({
      stepCompleted: p.followUpStep,
      lastFollowUpAt: p.lastFollowUpAt,
      createdAt: p.createdAt,
    });
    await prisma.project.update({
      where: { id: p.id },
      data: {
        followUpStatus: "ACTIVE",
        nextFollowUpOn: next,
      },
    });
    updated++;
  }

  // Also pause completed/cancelled that still look ACTIVE with a next date
  const closed = await prisma.project.updateMany({
    where: {
      status: { in: ["CANCELLED", "COMPLETED"] },
      followUpStatus: "ACTIVE",
    },
    data: {
      followUpStatus: "PAUSED",
      nextFollowUpOn: null,
    },
  });

  console.log(`Backfilled ${updated} open projects; paused ${closed.count} closed projects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
