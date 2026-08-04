/**
 * Daily plan generator: runs at midnight via node-cron.
 * Computes trust weights, volumes, and creates WarmupEvent rows.
 */
import { PrismaClient } from "@prisma/client";
import { buildDailyPlan, computeTrustWeight, computeDailyTargetVolume } from "../lib/warmup-strategy";
import { generateTemplateBatch } from "../lib/ai-content";
import { personalizeEmailContent, resolveDisplayName } from "../lib/personalize";
import logger from "./logger";

const prisma = new PrismaClient();

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

    // Recompute trust weights and daily volumes for all accounts
    for (const account of accounts) {
      const tw = computeTrustWeight(
        { ...account, role: account.role },
        config.rampUpDays,
        new Date()
      );
      const dailyTarget = computeDailyTargetVolume(tw, totalActive, config, true);

      await prisma.account.update({
        where: { id: account.id },
        data: {
          trustWeight: tw,
          dailyTargetVolume: dailyTarget,
          sentToday: 0, // reset daily counter
        },
      });

      logger.info(
        { accountId: account.id, email: account.email, tw, dailyTarget },
        "Updated account trust weight and daily volume"
      );
    }

    // Build the pair cooldown set (last minPairCooldownHours)
    const cooldownSince = new Date(
      Date.now() - config.minPairCooldownHours * 60 * 60 * 1000
    );
    const recentEvents = await prisma.warmupEvent.findMany({
      where: { scheduledFor: { gte: cooldownSince } },
      select: { senderId: true, receiverId: true },
    });

    const recentPairsMap: Record<string, Set<string>> = {};
    for (const evt of recentEvents) {
      if (!recentPairsMap[evt.senderId]) {
        recentPairsMap[evt.senderId] = new Set();
      }
      recentPairsMap[evt.senderId].add(`${evt.senderId}:${evt.receiverId}`);
    }

    // Refresh template cache if running low
    const templateCount = await prisma.contentTemplate.count();
    if (templateCount < 20) {
      logger.info("Refreshing content template cache (20 new templates)...");
      const newTemplates = await generateTemplateBatch(20, config.aiProvider);
      await prisma.contentTemplate.createMany({
        data: newTemplates.map((t) => ({
          subject: t.subject,
          body: t.body,
        })),
      });
      logger.info(`Added ${newTemplates.length} new content templates`);
    }

    // Get available templates
    const templates = await prisma.contentTemplate.findMany({
      orderBy: { usedCount: "asc" },
      take: 100,
    });

    if (templates.length === 0) {
      logger.error("No content templates available, cannot generate plan");
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
    };

    const plan = buildDailyPlan(
      accountInputs,
      configInput,
      today,
      (senderId) => recentPairsMap[senderId] || new Set()
    );

    logger.info(`Daily plan: ${plan.slots.length} send slots across ${accounts.length} accounts`);

    // Write WarmupEvent rows for each slot (personalized with real names)
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    let templateIdx = 0;
    const eventsToCreate = plan.slots.map((slot) => {
      const template = templates[templateIdx % templates.length];
      templateIdx++;
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
        receiverName
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

      // Update usedCount on templates
      const usedTemplateIds = templates
        .slice(0, Math.min(templateIdx, templates.length))
        .map((t) => t.id);
      await prisma.contentTemplate.updateMany({
        where: { id: { in: usedTemplateIds } },
        data: { usedCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    }

    logger.info(`Daily plan complete: created ${eventsToCreate.length} warmup events`);
  } catch (err) {
    logger.error({ err }, "Daily planner failed");
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
