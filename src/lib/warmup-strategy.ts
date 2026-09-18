import { capOldVolumeForNewPool, resolveSafetyLimits } from "./safety";

/**
 * Pure, side-effect-free warmup strategy module.
 * Takes accounts + config, returns a daily send plan.
 * No DB or I/O calls — fully unit-testable.
 */

export interface AccountInput {
  id: string;
  email: string;
  role: string; // "OLD" | "NEW"
  status: string;
  warmupStartedAt: Date;
  sentToday: number;
}

export interface ConfigInput {
  rampUpDays: number;
  startVolumePerDay: number;
  maxVolumePerDay: number;
  minDelayBetweenSendsMs: number;
  maxDelayBetweenSendsMs: number;
  replyProbability: number;
  activeHourStart: number;
  activeHourEnd: number;
  minPairCooldownHours: number;
  maxInboundPerReceiverPerDay?: number;
  maxOldDailySendsWhenFewNew?: number;
}

export interface SendSlot {
  senderId: string;
  receiverId: string;
  scheduledFor: Date;
}

export interface DailyPlan {
  slots: SendSlot[];
  accountVolumes: Record<string, number>; // accountId -> targetVolume
}

/** Clamp a number between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Seeded pseudo-random using Math.random (suitable for tests to inject deterministic values) */
type RngFn = () => number;

/** Compute trust weight for a single account */
export function computeTrustWeight(
  account: AccountInput,
  rampUpDays: number,
  today: Date = new Date()
): number {
  if (account.role === "OLD") return 1.0;
  const daysInWarmup = Math.floor(
    (today.getTime() - account.warmupStartedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(1.0, daysInWarmup / rampUpDays);
}

/** Compute daily target volume for a single account, given pool size */
export function computeDailyTargetVolume(
  trustWeight: number,
  totalActiveAccounts: number,
  config: Pick<ConfigInput, "startVolumePerDay" | "maxVolumePerDay">,
  jitter = true,
  rng: RngFn = Math.random
): number {
  const baseVolume =
    config.startVolumePerDay +
    (config.maxVolumePerDay - config.startVolumePerDay) * trustWeight;
  const poolSizeFactor = clamp(totalActiveAccounts / 10, 0.5, 2.0);
  let volume = Math.round(baseVolume * poolSizeFactor);

  if (jitter) {
    // ±15% jitter
    const jitterFactor = 1 + (rng() - 0.5) * 0.3;
    volume = Math.max(1, Math.round(volume * jitterFactor));
  }

  return Math.min(volume, config.maxVolumePerDay);
}

/**
 * Weighted random selection from a list of candidates.
 * weights must correspond 1:1 with candidates.
 */
export function weightedRandom<T>(
  candidates: T[],
  weights: number[],
  rng: RngFn = Math.random
): T | null {
  if (candidates.length === 0) return null;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export type SelectRecipientOptions = {
  inboundUsed?: Record<string, number>;
  maxInboundPerDay?: number;
  /** How often this sender→receiver pair was used recently (lower is better) */
  pairUsage?: Record<string, number>;
};

function remainingInbound(
  receiverId: string,
  inboundUsed: Record<string, number>,
  maxInboundPerDay: number
): number {
  return Math.max(0, maxInboundPerDay - (inboundUsed[receiverId] ?? 0));
}

/**
 * Select a NEW recipient for an OLD sender.
 *
 * Pairing rules:
 * - OLD → NEW only (never OLD → OLD; NEW never initiates)
 * - Skip NEW inboxes already at today's inbound cap
 * - Avoid the same sender→receiver pair when another NEW is available
 * - Spread mail across the NEW pool (least inbound today, least-used pair)
 */
export function selectRecipient(
  senderId: string,
  activeAccounts: AccountInput[],
  trustWeights: Record<string, number>,
  recentPairs: Set<string>,
  rng: RngFn = Math.random,
  senderRole?: string,
  options: SelectRecipientOptions = {}
): AccountInput | null {
  const sender =
    senderRole !== undefined
      ? { role: senderRole }
      : activeAccounts.find((a) => a.id === senderId);

  if (sender?.role === "NEW") {
    return null;
  }

  const inboundUsed = options.inboundUsed ?? {};
  const maxInboundPerDay = options.maxInboundPerDay ?? Number.POSITIVE_INFINITY;
  const pairUsage = options.pairUsage ?? {};

  const eligibleNew = activeAccounts.filter(
    (a) =>
      a.id !== senderId &&
      a.role === "NEW" &&
      remainingInbound(a.id, inboundUsed, maxInboundPerDay) > 0
  );

  if (eligibleNew.length === 0) return null;

  const notOnCooldown = eligibleNew.filter(
    (a) => !recentPairs.has(`${senderId}:${a.id}`)
  );
  const candidates = notOnCooldown.length > 0 ? notOnCooldown : eligibleNew;

  const weights = candidates.map((c) => {
    const remaining = remainingInbound(c.id, inboundUsed, maxInboundPerDay);
    const usedToday = inboundUsed[c.id] ?? 0;
    const usedPair = pairUsage[`${senderId}:${c.id}`] ?? 0;
    const tw = trustWeights[c.id] ?? 0;
    // Strongly prefer NEW inboxes that have received nothing today (covers brand-new accounts)
    const coverageBoost = usedToday === 0 ? 40 : 0;
    return Math.max(
      0.01,
      coverageBoost +
        remaining * 8 +
        4 / (1 + usedPair) +
        (1 - tw) * 0.5 +
        rng() * 0.2
    );
  });

  return weightedRandom(candidates, weights, rng);
}

/**
 * Generate random send timestamps scattered across active hours.
 * Ensures minimum gap between sends from the same sender.
 */
export function generateSendTimestamps(
  count: number,
  date: Date,
  activeHourStart: number,
  activeHourEnd: number,
  minDelayMs: number,
  maxDelayMs: number,
  rng: RngFn = Math.random
): Date[] {
  const dayStart = new Date(date);
  dayStart.setHours(activeHourStart, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(activeHourEnd, 0, 0, 0);

  const windowMs = dayEnd.getTime() - dayStart.getTime();
  if (windowMs <= 0 || count <= 0) return [];

  const timestamps: number[] = [];
  let cursor = dayStart.getTime() + Math.floor(rng() * minDelayMs);

  for (let i = 0; i < count; i++) {
    if (cursor >= dayEnd.getTime()) break;
    timestamps.push(cursor);
    const gap = minDelayMs + Math.floor(rng() * (maxDelayMs - minDelayMs));
    cursor += gap;
  }

  // Shuffle so order isn't always the same
  for (let i = timestamps.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [timestamps[i], timestamps[j]] = [timestamps[j], timestamps[i]];
  }

  return timestamps.sort((a, b) => a - b).map((t) => new Date(t));
}

/**
 * Build the full daily plan for all active accounts.
 * Returns SendSlots with scheduledFor timestamps.
 *
 * @param inboundAlreadyToday - successful+queued inbound counts per receiver today
 *   (used so we do not schedule past maxInboundPerReceiverPerDay after a flood)
 */
export function buildDailyPlan(
  accounts: AccountInput[],
  config: ConfigInput,
  today: Date = new Date(),
  recentPairsFn: (senderId: string) => Set<string> = () => new Set(),
  rng: RngFn = Math.random,
  inboundAlreadyToday: Record<string, number> = {},
  pairUsage: Record<string, number> = {}
): DailyPlan {
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE");
  if (activeAccounts.length < 2) {
    return { slots: [], accountVolumes: {} };
  }

  // Compute trust weights for all accounts
  const trustWeights: Record<string, number> = {};
  for (const acc of activeAccounts) {
    trustWeights[acc.id] = computeTrustWeight(acc, config.rampUpDays, today);
  }

  const totalActive = activeAccounts.length;
  const oldAccounts = activeAccounts.filter((a) => a.role === "OLD");
  const newAccounts = activeAccounts.filter((a) => a.role === "NEW");
  const oldCount = oldAccounts.length;
  const newCount = newAccounts.length;
  const safety = resolveSafetyLimits(config);

  // Remaining inbound capacity per NEW (plan-local + already delivered today)
  const inboundUsed: Record<string, number> = { ...inboundAlreadyToday };
  const pairUsageLive: Record<string, number> = { ...pairUsage };

  // Shuffle OLD senders so the same account is not always first in the queue
  const senders = [...activeAccounts];
  for (let i = senders.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [senders[i], senders[j]] = [senders[j], senders[i]];
  }

  // Compute volumes and generate timestamps
  const accountVolumes: Record<string, number> = {};
  const allSlots: SendSlot[] = [];

  for (const sender of senders) {
    const tw = trustWeights[sender.id];
    let targetVolume = computeDailyTargetVolume(tw, totalActive, config, true, rng);

    // CRITICAL: if few NEW accounts, do not let every OLD dump full volume onto them
    if (sender.role === "OLD") {
      targetVolume = capOldVolumeForNewPool(
        targetVolume,
        oldCount,
        newCount,
        safety.maxInboundPerReceiverPerDay,
        safety.maxOldDailySendsWhenFewNew
      );
    } else if (sender.role === "NEW") {
      // NEW never initiates — only replies in-thread via IMAP worker
      targetVolume = 0;
    }

    accountVolumes[sender.id] = targetVolume;

    const timestamps = generateSendTimestamps(
      targetVolume,
      today,
      config.activeHourStart,
      config.activeHourEnd,
      config.minDelayBetweenSendsMs,
      config.maxDelayBetweenSendsMs,
      rng
    );

    // Mutable copy so same-day plan doesn't reuse the same pair repeatedly
    const recentPairs = new Set(recentPairsFn(sender.id));
    const selectOpts: SelectRecipientOptions = {
      inboundUsed,
      maxInboundPerDay: safety.maxInboundPerReceiverPerDay,
      pairUsage: pairUsageLive,
    };

    for (const ts of timestamps) {
      const recipient = selectRecipient(
        sender.id,
        activeAccounts,
        trustWeights,
        recentPairs,
        rng,
        sender.role,
        selectOpts
      );

      if (!recipient) continue;

      const pairKey = `${sender.id}:${recipient.id}`;
      inboundUsed[recipient.id] = (inboundUsed[recipient.id] ?? 0) + 1;
      pairUsageLive[pairKey] = (pairUsageLive[pairKey] ?? 0) + 1;
      recentPairs.add(pairKey);

      allSlots.push({
        senderId: sender.id,
        receiverId: recipient.id,
        scheduledFor: ts,
      });
    }
  }

  // Coverage pass: every ACTIVE NEW with remaining inbound room must get ≥1 slot
  // when there is at least one OLD sender (fixes brand-new accounts missing today's plan).
  if (oldCount > 0 && newCount > 0) {
    const receiversHit = new Set(allSlots.map((s) => s.receiverId));
    const starvedNew = newAccounts.filter(
      (a) =>
        remainingInbound(a.id, inboundUsed, safety.maxInboundPerReceiverPerDay) >
          0 && !receiversHit.has(a.id)
    );

    for (const newbie of starvedNew) {
      // Prefer an OLD that has not mailed this NEW recently
      const oldSorted = [...oldAccounts].sort((a, b) => {
        const ua = pairUsageLive[`${a.id}:${newbie.id}`] ?? 0;
        const ub = pairUsageLive[`${b.id}:${newbie.id}`] ?? 0;
        return ua - ub;
      });
      const donor = oldSorted[0];
      if (!donor) continue;

      const dayStart = new Date(today);
      dayStart.setHours(config.activeHourStart, 0, 0, 0);
      const dayEnd = new Date(today);
      dayEnd.setHours(config.activeHourEnd, 0, 0, 0);
      const window = Math.max(1, dayEnd.getTime() - dayStart.getTime());
      const scheduledFor = new Date(
        dayStart.getTime() + Math.floor(rng() * window)
      );

      const pairKey = `${donor.id}:${newbie.id}`;
      inboundUsed[newbie.id] = (inboundUsed[newbie.id] ?? 0) + 1;
      pairUsageLive[pairKey] = (pairUsageLive[pairKey] ?? 0) + 1;
      accountVolumes[donor.id] = (accountVolumes[donor.id] ?? 0) + 1;

      allSlots.push({
        senderId: donor.id,
        receiverId: newbie.id,
        scheduledFor,
      });
    }
  }

  // Keep chronological order for the SMTP queue
  allSlots.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  return { slots: allSlots, accountVolumes };
}
