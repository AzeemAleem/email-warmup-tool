/**
 * Art Paper sheet sizes for the Rigid Box Calculator (inches).
 * Single flat list — no STANDARD / OUT split.
 */

import type { SheetSize } from "./sheetSizes";

/** Art paper sheets available for nesting / costing */
export const ART_PAPER_SHEETS: readonly SheetSize[] = [
  { width: 20, height: 30, batch: "STANDARD" },
  { width: 23, height: 36, batch: "STANDARD" },
  { width: 25, height: 36, batch: "STANDARD" },
  { width: 30, height: 40, batch: "STANDARD" },
  { width: 30, height: 50, batch: "STANDARD" },
  { width: 40, height: 60, batch: "STANDARD" },
] as const;

/** Art paper nesting padding (inches) — Rigid page only */
export const DEFAULT_ART_PADDING_W_IN = 2;
export const DEFAULT_ART_PADDING_H_IN = 2;

export function assertRigidSheetDataIntegrity(): void {
  if (ART_PAPER_SHEETS.length !== 6) {
    throw new Error(
      `Expected 6 art paper sheets, got ${ART_PAPER_SHEETS.length}`,
    );
  }
  const keys = ART_PAPER_SHEETS.map((s) => `${s.width}x${s.height}`);
  if (new Set(keys).size !== keys.length) {
    throw new Error("Duplicate art paper sheet sizes");
  }
  const expected = ["20x30", "23x36", "25x36", "30x40", "30x50", "40x60"];
  for (const k of expected) {
    if (!keys.includes(k)) {
      throw new Error(`Missing art paper sheet ${k}`);
    }
  }
}
