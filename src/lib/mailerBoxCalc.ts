/**
 * Roll-end tuck-top (RETT) mailer box with double side walls — flat open size.
 *
 * Width direction:  wing + side wall + base (L) + side wall + wing  →  L + 4H
 *                   plus fold_allowance
 * Height direction: front (H) + base (W) + back (H) + lid (W) + tuck (H)  →  2W + 3H
 */

export type LengthUnit = "mm" | "cm" | "in";

export interface MailerBoxDimensions {
  /** Long side of the base panel (horizontal in the dieline) */
  length: number;
  /** Short side of the base panel (depth) */
  width: number;
  /** Wall height */
  height: number;
}

/** Editable constants — stored in millimetres */
export interface MailerBoxOptions {
  /** Extra fold / score allowance added to open width (mm). Default 13 mm (0.5118 in). */
  foldAllowanceMm: number;
}

export interface MailerBoxOpenSize {
  openWidthMm: number;
  openHeightMm: number;
}

export interface MailerBoxResultAllUnits {
  mm: { openWidth: number; openHeight: number };
  cm: { openWidth: number; openHeight: number };
  in: { openWidth: number; openHeight: number };
}

/** ── Editable defaults (change here) ─────────────────────────────────────── */
export const DEFAULT_OPTIONS: Readonly<MailerBoxOptions> = {
  foldAllowanceMm: 13, // 0.5118 in
};

/** Conversion factors relative to millimetres */
const MM_PER: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
};

export function toMm(value: number, unit: LengthUnit): number {
  return value * MM_PER[unit];
}

export function fromMm(valueMm: number, unit: LengthUnit): number {
  return valueMm / MM_PER[unit];
}

export function convertLength(
  value: number,
  from: LengthUnit,
  to: LengthUnit,
): number {
  if (from === to) return value;
  return fromMm(toMm(value, from), to);
}

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

/** Round mm/cm to 2 decimals; inches to 4. Never returns NaN/Infinity. */
export function roundForUnit(value: number, unit: LengthUnit): number {
  if (!Number.isFinite(value)) return 0;
  const decimals = unit === "in" ? 4 : 2;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatLength(value: number, unit: LengthUnit): string {
  const rounded = roundForUnit(value, unit);
  const decimals = unit === "in" ? 4 : 2;
  return rounded.toFixed(decimals);
}

export function unitLabel(unit: LengthUnit): string {
  return unit === "in" ? "in" : unit;
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

  return {
    mm: {
      openWidth: roundForUnit(openWidthMm, "mm"),
      openHeight: roundForUnit(openHeightMm, "mm"),
    },
    cm: {
      openWidth: roundForUnit(fromMm(openWidthMm, "cm"), "cm"),
      openHeight: roundForUnit(fromMm(openHeightMm, "cm"), "cm"),
    },
    in: {
      openWidth: roundForUnit(fromMm(openWidthMm, "in"), "in"),
      openHeight: roundForUnit(fromMm(openHeightMm, "in"), "in"),
    },
  };
}
