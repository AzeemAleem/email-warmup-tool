/**
 * Roll-end tuck-top (RETT) mailer box with double side walls — flat open size.
 *
 * Width direction:  wing + side wall + base (L) + side wall + wing  →  L + 4H
 *                   plus fold_allowance
 * Height direction: front (H) + base (W) + back (H) + lid (W) + tuck (H)  →  2W + 3H
 */

import {
  fromMm,
  openSizeToAllUnits,
  toMm,
  type LengthUnit,
  type OpenSizeAllUnits,
} from "./lengthUnits";

// Re-export shared helpers so existing imports keep working
export type { LengthUnit } from "./lengthUnits";
export {
  convertLength,
  formatLength,
  fromMm,
  nestingSizeIn,
  roundForUnit,
  toMm,
  unitLabel,
} from "./lengthUnits";

export interface MailerBoxDimensions {
  /** Long side of the base panel (horizontal in the dieline) */
  length: number;
  /** Short side of the base panel (depth) */
  width: number;
  /** Wall height */
  height: number;
}

/** Editable constants — fold in mm; nesting padding in inches */
export interface MailerBoxOptions {
  /** Extra fold / score allowance added to open width (mm). Default 13 mm (0.5118 in). */
  foldAllowanceMm: number;
  /** Padding added to open width before sheet nesting (inches). Default 1. */
  paddingWIn?: number;
  /** Padding added to open height before sheet nesting (inches). Default 1. */
  paddingHIn?: number;
}

export interface MailerBoxOpenSize {
  openWidthMm: number;
  openHeightMm: number;
}

export type MailerBoxResultAllUnits = OpenSizeAllUnits;

/** ── Editable defaults (change here) ─────────────────────────────────────── */
export const DEFAULT_OPTIONS: Readonly<MailerBoxOptions> = {
  foldAllowanceMm: 13, // 0.5118 in
  paddingWIn: 1,
  paddingHIn: 1,
};

/**
 * Flat open size in millimetres.
 *
 * Open Width  = L + (4 × H) + fold_allowance
 * Open Height = (2 × W) + (3 × H)
 */
export function calcOpenSizeMm(
  dims: MailerBoxDimensions,
  options: MailerBoxOptions = DEFAULT_OPTIONS,
): MailerBoxOpenSize {
  const { length: L, width: W, height: H } = dims;
  const openWidthMm = L + 4 * H + options.foldAllowanceMm;
  const openHeightMm = 2 * W + 3 * H;
  return { openWidthMm, openHeightMm };
}

/**
 * Full pipeline: dimensions in `unit` → mm → open size → all units (rounded).
 * Returns null if any dimension is not a finite positive number,
 * or if foldAllowanceMm is not a finite non-negative number.
 */
export function calcMailerBox(
  dims: MailerBoxDimensions,
  unit: LengthUnit,
  options: MailerBoxOptions = DEFAULT_OPTIONS,
): MailerBoxResultAllUnits | null {
  const { length, width, height } = dims;
  if (
    ![length, width, height].every((n) => Number.isFinite(n) && n > 0) ||
    !Number.isFinite(options.foldAllowanceMm) ||
    options.foldAllowanceMm < 0
  ) {
    return null;
  }

  const { openWidthMm, openHeightMm } = calcOpenSizeMm(
    {
      length: toMm(length, unit),
      width: toMm(width, unit),
      height: toMm(height, unit),
    },
    options,
  );

  if (!Number.isFinite(openWidthMm) || !Number.isFinite(openHeightMm)) {
    return null;
  }

  return openSizeToAllUnits(openWidthMm, openHeightMm);
}
