/**
 * Printing sheet sizes for mailer box nesting (all dimensions in inches).
 * STANDARD = preferred batch. OUT = fallback only when no STANDARD fits.
 */

export type SheetBatch = "STANDARD" | "OUT";

export interface SheetSize {
  width: number;
  height: number;
  batch: SheetBatch;
}

/** Batch Standard (preferred) — exactly 7 sheets */
export const BATCH_STANDARD: readonly SheetSize[] = [
  { width: 20, height: 30, batch: "STANDARD" },
  { width: 22, height: 28, batch: "STANDARD" },
  { width: 23, height: 36, batch: "STANDARD" },
  { width: 25, height: 36, batch: "STANDARD" },
  { width: 25, height: 30, batch: "STANDARD" },
  { width: 30, height: 40, batch: "STANDARD" },
  { width: 27, height: 40, batch: "STANDARD" },
] as const;

/** Batch OUT (fallback) — exactly 10 sheets. 30×50 lives here only. */
export const BATCH_OUT: readonly SheetSize[] = [
  { width: 22, height: 32, batch: "OUT" },
  { width: 20, height: 36, batch: "OUT" },
  { width: 22, height: 34, batch: "OUT" },
  { width: 25, height: 32, batch: "OUT" },
  { width: 25, height: 34, batch: "OUT" },
  { width: 36, height: 50, batch: "OUT" },
  { width: 30, height: 50, batch: "OUT" },
  { width: 25, height: 40, batch: "OUT" },
  { width: 31, height: 43, batch: "OUT" },
  { width: 20, height: 32, batch: "OUT" },
] as const;

export const ALL_SHEETS: readonly SheetSize[] = [
  ...BATCH_STANDARD,
  ...BATCH_OUT,
];

export function sheetKey(s: SheetSize): string {
  return `${s.width}x${s.height}`;
}

/** Validate lists have no duplicates within or across batches. */
export function assertSheetDataIntegrity(): void {
  const keys = ALL_SHEETS.map(sheetKey);
  if (new Set(keys).size !== keys.length) {
    throw new Error("Duplicate sheet sizes found in sheet data");
  }
  if (BATCH_STANDARD.length !== 7) {
    throw new Error(`Expected 7 STANDARD sheets, got ${BATCH_STANDARD.length}`);
  }
  if (BATCH_OUT.length !== 10) {
    throw new Error(`Expected 10 OUT sheets, got ${BATCH_OUT.length}`);
  }
  if (BATCH_STANDARD.some((s) => sheetKey(s) === "30x50")) {
    throw new Error("30x50 must not appear in STANDARD");
  }
  if (!BATCH_OUT.some((s) => sheetKey(s) === "30x50")) {
    throw new Error("30x50 must appear in OUT");
  }
}
