/**
 * Rigid box — flat open size (stacked panels, each L wide).
 *
 * Layout (vertical strip):
 *   Panel 1: L × H
 *   Panel 2: L × W
 *   Panel 3: L × H
 *   Panel 4: L × W
 *   Panel 5: L × H
 *
 * Open Width  = L + WIDTH_ALLOWANCE
 * Open Height = (3 × H) + (2 × W) + HEIGHT_ALLOWANCE
 */

import {
  openSizeToAllUnits,
  toMm,
  type LengthUnit,
  type OpenSizeAllUnits,
} from "./lengthUnits";

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

export interface RigidBoxDimensions {
  /** Long side of the base */
  length: number;
  /** Short side of the base (depth) */
  width: number;
  /** Box height */
  height: number;
}

export interface RigidBoxOptions {
  /** Added to open width (mm). Default 0. */
  widthAllowanceMm: number;
  /** Added to open height (mm). Default 0. */
  heightAllowanceMm: number;
  /** Art paper nesting padding on open width (inches). Default 2. */
  paddingWIn?: number;
  /** Art paper nesting padding on open height (inches). Default 2. */
  paddingHIn?: number;
}

export interface RigidBoxOpenSize {
  openWidthMm: number;
  openHeightMm: number;
}

export type RigidBoxResultAllUnits = OpenSizeAllUnits;

/** ── Editable defaults (change here) ─────────────────────────────────────── */
export const DEFAULT_RIGID_OPTIONS: Readonly<RigidBoxOptions> = {
  widthAllowanceMm: 0,
  heightAllowanceMm: 0,
  paddingWIn: 2,
  paddingHIn: 2,
};

/**
 * Flat open size in millimetres.
 *
 * Open Width  = L + WIDTH_ALLOWANCE
 * Open Height = (3 × H) + (2 × W) + HEIGHT_ALLOWANCE
 */
export function calcRigidOpenSizeMm(
  dims: RigidBoxDimensions,
  options: RigidBoxOptions = DEFAULT_RIGID_OPTIONS,
): RigidBoxOpenSize {
  const { length: L, width: W, height: H } = dims;
  const openWidthMm = L + options.widthAllowanceMm;
  const openHeightMm = 3 * H + 2 * W + options.heightAllowanceMm;
  return { openWidthMm, openHeightMm };
}

/**
 * Full pipeline: dimensions in `unit` → mm → open size → all units (rounded).
 */
export function calcRigidBox(
  dims: RigidBoxDimensions,
  unit: LengthUnit,
  options: RigidBoxOptions = DEFAULT_RIGID_OPTIONS,
): RigidBoxResultAllUnits | null {
  const { length, width, height } = dims;
  if (
    ![length, width, height].every((n) => Number.isFinite(n) && n > 0) ||
    !Number.isFinite(options.widthAllowanceMm) ||
    !Number.isFinite(options.heightAllowanceMm) ||
    options.widthAllowanceMm < 0 ||
    options.heightAllowanceMm < 0
  ) {
    return null;
  }

  const { openWidthMm, openHeightMm } = calcRigidOpenSizeMm(
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
