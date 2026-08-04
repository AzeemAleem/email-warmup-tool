/**
 * Hard safety limits for deliverability (long-term / Google-safe).
 * Prevents dumping volume onto a small NEW pool.
 */
export const SAFETY = {
  /** Max warmup emails one account may RECEIVE per calendar day */
  maxInboundPerReceiverPerDay: 3,
  /** Max warmup emails one account may RECEIVE per rolling hour */
  maxInboundPerReceiverPerHour: 4,
  /** Min milliseconds between any two warmup mails into the same inbox */
  minGapBetweenInboundMs: 60 * 60 * 1000, // 1 hour
  /** Max sends processed in one SMTP worker tick (every ~5 min) */
  maxSendsPerTick: 1,
  /** Never send to the same receiver more than once in a single tick */
  maxSendsToSameReceiverPerTick: 1,
  /** Hard ceiling for one OLD account's daily sends when NEW pool is small */
  maxOldDailySendsWhenFewNew: 3,
} as const;

/**
 * Cap an OLD account's daily send volume so total inbound
 * to NEW accounts stays within maxInboundPerReceiverPerDay.
 *
 * Example: 3 OLD + 1 NEW, maxInbound=3 → each OLD at most floor(3/3)=1 send/day
 * Example: 3 OLD + 2 NEW, maxInbound=3 → each OLD at most floor(6/3)=2 sends/day
 */
export function capOldVolumeForNewPool(
  proposedVolume: number,
  oldCount: number,
  newCount: number,
  maxInboundPerNew: number = SAFETY.maxInboundPerReceiverPerDay
): number {
  if (newCount <= 0 || oldCount <= 0) return 0;
  const sharedCap = Math.floor((newCount * maxInboundPerNew) / oldCount);
  return Math.max(
    0,
    Math.min(proposedVolume, sharedCap, SAFETY.maxOldDailySendsWhenFewNew)
  );
}
