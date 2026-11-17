/** Project follow-up Monday cadence (Asia/Karachi calendar). */

export const FOLLOW_UP_TZ = "Asia/Karachi";
export const FOLLOW_UP_MAX_STEP = 6;

export type FollowUpStatus = "ACTIVE" | "PAUSED" | "DEAD";

type Ymd = { y: number; m: number; d: number };

function partsInTz(date: Date, timeZone = FOLLOW_UP_TZ): Ymd {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d };
}

/** Noon UTC on that calendar day — stable date-only storage. */
export function dateOnlyUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function weekdayMon0(y: number, m: number, d: number): number {
  // JS: 0=Sun..6=Sat → Mon=0..Sun=6
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return (dow + 6) % 7;
}

function addDaysYmd(ymd: Ymd, days: number): Ymd {
  const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + days, 12, 0, 0));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

/** First Monday on or after the given instant (Karachi calendar day). */
export function nextMondayOnOrAfter(date: Date): Date {
  const ymd = partsInTz(date);
  const mon0 = weekdayMon0(ymd.y, ymd.m, ymd.d);
  const add = mon0 === 0 ? 0 : 7 - mon0;
  const next = addDaysYmd(ymd, add);
  return dateOnlyUtc(next.y, next.m, next.d);
}

/** If already Monday keep it; otherwise next Monday. */
export function snapForwardToMonday(date: Date): Date {
  return nextMondayOnOrAfter(date);
}

export function addCalendarDays(date: Date, days: number): Date {
  const ymd = partsInTz(date);
  const next = addDaysYmd(ymd, days);
  return dateOnlyUtc(next.y, next.m, next.d);
}

/**
 * After `stepCompleted` follow-ups (0–6), compute the next due Monday.
 * Returns null when the cadence is finished (after step 6).
 */
export function computeNextFollowUpOn(opts: {
  stepCompleted: number;
  lastFollowUpAt: Date | null;
  createdAt: Date;
}): Date | null {
  const step = Math.max(0, Math.min(FOLLOW_UP_MAX_STEP, Math.floor(opts.stepCompleted)));
  if (step >= FOLLOW_UP_MAX_STEP) return null;

  if (step === 0) {
    return nextMondayOnOrAfter(opts.createdAt);
  }

  const last = opts.lastFollowUpAt ?? opts.createdAt;
  if (step === 1 || step === 2) {
    // FU2 / FU3: weekly from last
    return snapForwardToMonday(addCalendarDays(last, 7));
  }
  if (step === 3) {
    return snapForwardToMonday(addCalendarDays(last, 15));
  }
  if (step === 4) {
    return snapForwardToMonday(addCalendarDays(last, 21));
  }
  // step === 5 → schedule FU6
  return snapForwardToMonday(addCalendarDays(last, 30));
}

export function initialFollowUpFields(createdAt: Date, projectStatus: string) {
  if (projectStatus === "CANCELLED" || projectStatus === "COMPLETED") {
    return {
      followUpStatus: "PAUSED" as FollowUpStatus,
      followUpStep: 0,
      nextFollowUpOn: null as Date | null,
      lastFollowUpAt: null as Date | null,
    };
  }
  return {
    followUpStatus: "ACTIVE" as FollowUpStatus,
    followUpStep: 0,
    nextFollowUpOn: computeNextFollowUpOn({
      stepCompleted: 0,
      lastFollowUpAt: null,
      createdAt,
    }),
    lastFollowUpAt: null as Date | null,
  };
}

/** End of "this Monday" window in Karachi (that Monday 23:59:59.999 local → UTC noon+). */
export function endOfThisMonday(now = new Date()): Date {
  const ymd = partsInTz(now);
  const mon0 = weekdayMon0(ymd.y, ymd.m, ymd.d);
  // Monday of current week (if Sun, go back 6 days)
  const monday = addDaysYmd(ymd, -mon0);
  // Use end of that Monday as date-only comparison via next day start - epsilon
  // Store comparisons as date-only noon; "end of Monday" = Monday itself for <= checks
  return dateOnlyUtc(monday.y, monday.m, monday.d);
}

export function startOfNextTuesday(now = new Date()): Date {
  const thisMon = endOfThisMonday(now);
  return addCalendarDays(thisMon, 1);
}
