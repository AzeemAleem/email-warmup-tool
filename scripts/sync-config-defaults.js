const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const c = await p.warmupConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {
      startVolumePerDay: 1,
      maxVolumePerDay: 10,
      maxInboundPerReceiverPerDay: 3,
      maxInboundPerReceiverPerHour: 1,
      minGapBetweenInboundMs: 7200000,
      maxSendsPerTick: 1,
      maxSendsToSameReceiverPerTick: 1,
      maxOldDailySendsWhenFewNew: 3,
    },
  });
  console.log({
    inboundDay: c.maxInboundPerReceiverPerDay,
    inboundHour: c.maxInboundPerReceiverPerHour,
    gapMs: c.minGapBetweenInboundMs,
    start: c.startVolumePerDay,
    max: c.maxVolumePerDay,
    tick: c.maxSendsPerTick,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
