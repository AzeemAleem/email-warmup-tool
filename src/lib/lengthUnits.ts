/**
 * Shared length unit conversion / formatting for box calculators.
 */

export type LengthUnit = "mm" | "cm" | "in";

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

/** Nesting size = open size (inches) + padding */
export function nestingSizeIn(
  openWidthIn: number,
  openHeightIn: number,
  paddingWIn: number = 1,
  paddingHIn: number = 1,
): { widthIn: number; heightIn: number } {
  return {
    widthIn: openWidthIn + paddingWIn,
    heightIn: openHeightIn + paddingHIn,
  };
}

export interface OpenSizeAllUnits {
  mm: { openWidth: number; openHeight: number };
  cm: { openWidth: number; openHeight: number };
  in: { openWidth: number; openHeight: number };
}

/** Convert open size in mm into rounded values for all display units. */
export function openSizeToAllUnits(
  openWidthMm: number,
  openHeightMm: number,
): OpenSizeAllUnits {
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
