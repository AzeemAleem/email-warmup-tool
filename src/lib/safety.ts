/**
 * Deliverability defaults. Prefer WarmupConfig DB values when present
 * so the Config page and worker stay in sync.
 */
export const SAFETY_DEFAULTS = {
  maxInboundPerReceiverPerDay: 3,
  maxInboundPerReceiverPerHour: 1,
  minGapBetweenInboundMs: 2 * 60 * 60 * 1000, // 2 hours
  maxSendsPerTick: 1,
  maxSendsToSameReceiverPerTick: 1,
  maxOldDailySendsWhenFewNew: 3,
} as const;

/** @deprecated use SAFETY_DEFAULTS — kept for older imports */
export const SAFETY = SAFETY_DEFAULTS;

export type SafetyLimits = {
  maxInboundPerReceiverPerDay: number;
  maxInboundPerReceiverPerHour: number;
  minGapBetweenInboundMs: number;
  maxSendsPerTick: number;
  maxSendsToSameReceiverPerTick: number;
  maxOldDailySendsWhenFewNew: number;
};

/** Merge DB config (or partial) with code defaults */
export function resolveSafetyLimits(
  config?: Partial<SafetyLimits> | null
): SafetyLimits {
  return {
    maxInboundPerReceiverPerDay:
      config?.maxInboundPerReceiverPerDay ??
      SAFETY_DEFAULTS.maxInboundPerReceiverPerDay,
    maxInboundPerReceiverPerHour:
      config?.maxInboundPerReceiverPerHour ??
      SAFETY_DEFAULTS.maxInboundPerReceiverPerHour,
    minGapBetweenInboundMs:
      config?.minGapBetweenInboundMs ?? SAFETY_DEFAULTS.minGapBetweenInboundMs,
    maxSendsPerTick:
      config?.maxSendsPerTick ?? SAFETY_DEFAULTS.maxSendsPerTick,
    maxSendsToSameReceiverPerTick:
      config?.maxSendsToSameReceiverPerTick ??
      SAFETY_DEFAULTS.maxSendsToSameReceiverPerTick,
    maxOldDailySendsWhenFewNew:
      config?.maxOldDailySendsWhenFewNew ??
      SAFETY_DEFAULTS.maxOldDailySendsWhenFewNew,
  };
}

/**
 * Cap an OLD account's daily send volume so total inbound
 * to NEW accounts stays within maxInboundPerReceiverPerDay.
 */
export function capOldVolumeForNewPool(
  proposedVolume: number,
  oldCount: number,
  newCount: number,
  maxInboundPerNew: number = SAFETY_DEFAULTS.maxInboundPerReceiverPerDay,
  maxOldDailyWhenFewNew: number = SAFETY_DEFAULTS.maxOldDailySendsWhenFewNew
): number {
  if (newCount <= 0 || oldCount <= 0) return 0;
  const sharedCap = Math.floor((newCount * maxInboundPerNew) / oldCount);
  return Math.max(
    0,
    Math.min(proposedVolume, sharedCap, maxOldDailyWhenFewNew)
  );
}

/** Human-readable summary for dashboard */
export function formatGapHours(ms: number): string {
  const h = ms / (60 * 60 * 1000);
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}
