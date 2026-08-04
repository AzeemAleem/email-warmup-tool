import { SAFETY, capOldVolumeForNewPool } from "./safety";

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

/**
 * Select a recipient for a given sender.
 *
 * Pairing rules (warmup intent):
 * - OLD senders → only NEW accounts (trusted mail builds new reputation)
 * - NEW senders → prefer OLD accounts (natural outbound to trusted inboxes);
 *   other NEW allowed as light fallback if no OLD available
 *
 * Also applies trust-weight bias among allowed candidates and pair cooldown.
 */
export function selectRecipient(
  senderId: string,
  activeAccounts: AccountInput[],
  trustWeights: Record<string, number>,
  recentPairs: Set<string>, // "senderId:receiverId" pairs within cooldown
  rng: RngFn = Math.random,
  senderRole?: string
): AccountInput | null {
  const sender =
    senderRole !== undefined
      ? { role: senderRole }
      : activeAccounts.find((a) => a.id === senderId);

  let candidates = activeAccounts.filter(
    (a) => a.id !== senderId && !recentPairs.has(`${senderId}:${a.id}`)
  );

  if (sender?.role === "OLD") {
    // Old accounts must warm new ones — never OLD → OLD
    candidates = candidates.filter((a) => a.role === "NEW");
  } else if (sender?.role === "NEW") {
    const oldCandidates = candidates.filter((a) => a.role === "OLD");
    if (oldCandidates.length > 0) {
      candidates = oldCandidates;
    }
    // else: no OLD available / all in cooldown — fall back to other NEW
  }

  if (candidates.length === 0) return null;

  const weights = candidates.map((c) => {
    const tw = trustWeights[c.id] ?? 0;
    // Among NEW recipients, lower trust still gets slightly more inbound
    return (1 - tw) * 0.7 + 0.3;
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
 */
export function buildDailyPlan(
  accounts: AccountInput[],
  config: ConfigInput,
  today: Date = new Date(),
  recentPairsFn: (senderId: string) => Set<string> = () => new Set(),
  rng: RngFn = Math.random
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

  // Compute volumes and generate timestamps
  const accountVolumes: Record<string, number> = {};
  const allSlots: SendSlot[] = [];

  for (const sender of activeAccounts) {
    const tw = trustWeights[sender.id];
    let targetVolume = computeDailyTargetVolume(tw, totalActive, config, true, rng);

    // CRITICAL: if few NEW accounts, do not let every OLD dump full volume onto them
    if (sender.role === "OLD") {
      targetVolume = capOldVolumeForNewPool(
        targetVolume,
        oldCount,
        newCount,
        SAFETY.maxInboundPerReceiverPerDay
      );
    } else if (sender.role === "NEW") {
      // NEW outbound stays modest early on (already ramped by trustWeight)
      targetVolume = Math.min(targetVolume, SAFETY.maxInboundPerReceiverPerDay);
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

    const recentPairs = recentPairsFn(sender.id);

    for (const ts of timestamps) {
      const recipient = selectRecipient(
        sender.id,
        activeAccounts,
        trustWeights,
        recentPairs,
        rng,
        sender.role
      );

      if (!recipient) continue;

      allSlots.push({
        senderId: sender.id,
        receiverId: recipient.id,
        scheduledFor: ts,
      });
    }
  }

  return { slots: allSlots, accountVolumes };
}
