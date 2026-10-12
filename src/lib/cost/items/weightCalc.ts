import type { WeightConfig } from "../costConfig";

/**
 * Per-unit weight (kg) from open size in inches (no art padding):
 * (openW × openH × GSM / DIVISOR) / SCALE
 * e.g. (12 × 27 × 1600 / 15500) / 100
 */
export function calcWeightPerUnitKg(
  openWidthIn: number,
  openHeightIn: number,
  config: WeightConfig,
): number | null {
  const { gsm, divisor, scale } = config;
  if (
    ![openWidthIn, openHeightIn, gsm, divisor, scale].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }
  const raw = (openWidthIn * openHeightIn * gsm) / divisor / scale;
  return Number.isFinite(raw) ? raw : null;
}

export function calcTotalWeightKg(
  perUnitKg: number,
  quantity: number,
): number | null {
  if (!Number.isFinite(perUnitKg) || perUnitKg <= 0) return null;
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const total = perUnitKg * quantity;
  return Number.isFinite(total) ? total : null;
}

/** Round weight for display (keeps enough precision for shipping). */
export function roundWeightKg(value: number, decimals: number = 4): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
