/**
 * Daily plan generator: runs at midnight via node-cron.
 * Computes trust weights, volumes, and creates WarmupEvent rows.
 */
import { PrismaClient } from "@prisma/client";
import { buildDailyPlan, computeTrustWeight, computeDailyTargetVolume } from "../lib/warmup-strategy";
import { capOldVolumeForNewPool, resolveSafetyLimits } from "../lib/safety";
import { getAllPackagingTemplates } from "../lib/email-templates";
import { generateTemplateBatch } from "../lib/ai-content";
import { personalizeEmailContent, resolveDisplayName, voiceForRole } from "../lib/personalize";
import logger from "./logger";

const prisma = new PrismaClient();

/** Statuses that count as a real (or pending) exchange for cooldown / inbound caps */
const EXCHANGE_STATUSES = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "OPENED",
  "REPLIED",
  "RESCUED_FROM_SPAM",
] as const;

export async function runDailyPlanner(): Promise<void> {
  logger.info("Daily planner starting...");

  try {
    // Load config
    const config = await prisma.warmupConfig.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    // Load all active accounts
    const accounts = await prisma.account.findMany({
      where: { status: "ACTIVE" },
    });

    if (accounts.length < 2) {
      logger.warn("Not enough active accounts for warmup (need at least 2)");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalActive = accounts.length;
    const oldCount = accounts.filter((a) => a.role === "OLD").length;
    const newCount = accounts.filter((a) => a.role === "NEW").length;
    const safety = resolveSafetyLimits(config);

    // Recompute trust weights and daily volumes for all accounts
    for (const account of accounts) {
      const tw = computeTrustWeight(
        { ...account, role: account.role },
        config.rampUpDays,
        new Date()
      );
      // NEW accounts do not initiate — only OLD get planned send volume (capped)
      let dailyTarget = 0;
      if (account.role === "OLD") {
        dailyTarget = capOldVolumeForNewPool(
          computeDailyTargetVolume(tw, totalActive, config, true),
          oldCount,
          newCount,
          safety.maxInboundPerReceiverPerDay,
          safety.maxOldDailySendsWhenFewNew
        );
      }

      await prisma.account.update({
        where: { id: account.id },
        data: {
          trustWeight: tw,
          dailyTargetVolume: dailyTarget,
          sentToday: 0, // reset daily counter
        },
      });

      logger.info(
        {
          accountId: account.id,
          email: account.email,
          role: account.role,
          tw,
          dailyTarget,
        },
        "Updated account trust weight and daily volume"
      );
    }

    // Pair cooldown: only real/pending exchanges (ignore FAILED from emergency-stop)
    const cooldownSince = new Date(
      Date.now() - config.minPairCooldownHours * 60 * 60 * 1000
    );
    const recentEvents = await prisma.warmupEvent.findMany({
      where: {
        scheduledFor: { gte: cooldownSince },
        status: { in: [...EXCHANGE_STATUSES] },
      },
      select: { senderId: true, receiverId: true },
    });

    const recentPairsMap: Record<string, Set<string>> = {};
    for (const evt of recentEvents) {
      if (!recentPairsMap[evt.senderId]) {
        recentPairsMap[evt.senderId] = new Set();
      }
      recentPairsMap[evt.senderId].add(`${evt.senderId}:${evt.receiverId}`);
    }

    // Inbound already used today per receiver (so flood days do not schedule more)
    const inboundRows = await prisma.warmupEvent.groupBy({
      by: ["receiverId"],
      where: {
        scheduledFor: { gte: today },
        status: { in: [...EXCHANGE_STATUSES] },
      },
      _count: { _all: true },
    });
    const inboundAlreadyToday: Record<string, number> = {};
    for (const row of inboundRows) {
      inboundAlreadyToday[row.receiverId] = row._count._all;
    }
    if (Object.keys(inboundAlreadyToday).length > 0) {
      logger.info(
        { inboundAlreadyToday, maxPerDay: safety.maxInboundPerReceiverPerDay },
        "Inbound already counted toward today's NEW caps"
      );
    }

    // Always refresh from the packaging question pool (ignore stale DB "meeting" templates)
    logger.info("Refreshing packaging content templates...");
    await prisma.contentTemplate.deleteMany({});
    const newTemplates = await generateTemplateBatch(80, config.aiProvider);
    await prisma.contentTemplate.createMany({
      data: newTemplates.map((t) => ({
        subject: t.subject,
        body: t.body,
      })),
    });
    logger.info(`Seeded ${newTemplates.length} packaging templates`);

    const packagingPool = getAllPackagingTemplates().sort(
      () => Math.random() - 0.5
    );
    if (packagingPool.length === 0) {
      logger.error("No packaging templates available, cannot generate plan");
      return;
    }

    // Build the daily plan
    const accountInputs = accounts.map((a) => ({
      id: a.id,
      email: a.email,
      role: a.role,
      status: a.status,
      warmupStartedAt: a.warmupStartedAt,
      sentToday: a.sentToday,
    }));

    const configInput = {
      rampUpDays: config.rampUpDays,
      startVolumePerDay: config.startVolumePerDay,
      maxVolumePerDay: config.maxVolumePerDay,
      minDelayBetweenSendsMs: config.minDelayBetweenSendsMs,
      maxDelayBetweenSendsMs: config.maxDelayBetweenSendsMs,
      replyProbability: config.replyProbability,
      activeHourStart: config.activeHourStart,
      activeHourEnd: config.activeHourEnd,
      minPairCooldownHours: config.minPairCooldownHours,
      maxInboundPerReceiverPerDay: config.maxInboundPerReceiverPerDay,
      maxOldDailySendsWhenFewNew: config.maxOldDailySendsWhenFewNew,
    };

    const plan = buildDailyPlan(
      accountInputs,
      configInput,
      today,
      (senderId) => recentPairsMap[senderId] || new Set(),
      Math.random,
      inboundAlreadyToday
    );

    // Persist volumes that reflect what was actually scheduled
    const scheduledBySender: Record<string, number> = {};
    for (const a of accounts) {
      scheduledBySender[a.id] = 0;
    }
    for (const slot of plan.slots) {
      scheduledBySender[slot.senderId] =
        (scheduledBySender[slot.senderId] || 0) + 1;
    }
    for (const [accountId, volume] of Object.entries(scheduledBySender)) {
      await prisma.account.update({
        where: { id: accountId },
        data: { dailyTargetVolume: volume },
      });
    }

    logger.info(
      `Daily plan: ${plan.slots.length} send slots across ${accounts.length} accounts`
    );
    if (plan.slots.length === 0 && oldCount > 0 && newCount > 0) {
      logger.warn(
        {
          oldCount,
          newCount,
          inboundAlreadyToday,
          maxInboundPerDay: safety.maxInboundPerReceiverPerDay,
          cooldownPairs: Object.fromEntries(
            Object.entries(recentPairsMap).map(([k, v]) => [k, Array.from(v)])
          ),
        },
        "0 send slots — NEW inboxes may already be at today's inbound cap, or no eligible pairs. Wait until tomorrow or lower prior SENT volume."
      );
    }

    // Write WarmupEvent rows for each slot (personalized with real names)
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const eventsToCreate = plan.slots.map((slot, i) => {
      const template = packagingPool[i % packagingPool.length];
      const sender = accountById.get(slot.senderId);
      const receiver = accountById.get(slot.receiverId);
      const senderName = resolveDisplayName(
        sender?.displayName,
        sender?.email || "Sender"
      );
      const receiverName = resolveDisplayName(
        receiver?.displayName,
        receiver?.email || "there"
      );
      const personalized = personalizeEmailContent(
        template.subject,
        template.body,
        senderName,
        receiverName,
        voiceForRole(sender?.role || "OLD")
      );
      return {
        senderId: slot.senderId,
        receiverId: slot.receiverId,
        subject: personalized.subject,
        bodyPreview: personalized.body,
        status: "QUEUED",
        scheduledFor: slot.scheduledFor,
      };
    });

    if (eventsToCreate.length > 0) {
      await prisma.warmupEvent.createMany({ data: eventsToCreate });
    }

    logger.info(`Daily plan complete: created ${eventsToCreate.length} warmup events`);
  } catch (err) {
    logger.error({ err }, "Daily planner failed");
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
