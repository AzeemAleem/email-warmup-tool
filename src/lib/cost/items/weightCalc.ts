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

/**
 * Volumetric / dimensional weight (kg) from closed box size in centimetres:
 * (lengthCm × widthCm × heightCm) / divisor
 * e.g. (25.4 × 20.32 × 7.62) / 5000
 *
 * Dimensions MUST be in cm — convert from mm/in before calling.
 */
export function calcVolumetricWeightPerUnitKg(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  volumetricDivisor: number = 5000,
): number | null {
  if (
    ![lengthCm, widthCm, heightCm, volumetricDivisor].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }
  const raw = (lengthCm * widthCm * heightCm) / volumetricDivisor;
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

/**
 * How many axis-aligned boxes fit in a carton, trying all box orientations.
 * Dimensions must share the same unit (typically inches).
 */
export function calcBoxesPerCartonByVolume(
  boxLength: number,
  boxWidth: number,
  boxHeight: number,
  cartonLength: number,
  cartonWidth: number,
  cartonHeight: number,
): number {
  if (
    ![
      boxLength,
      boxWidth,
      boxHeight,
      cartonLength,
      cartonWidth,
      cartonHeight,
    ].every((n) => Number.isFinite(n) && n > 0)
  ) {
    return 0;
  }

  const orients: [number, number, number][] = [
    [boxLength, boxWidth, boxHeight],
    [boxLength, boxHeight, boxWidth],
    [boxWidth, boxLength, boxHeight],
    [boxWidth, boxHeight, boxLength],
    [boxHeight, boxLength, boxWidth],
    [boxHeight, boxWidth, boxLength],
  ];

  let best = 0;
  for (const [a, b, c] of orients) {
    const fit =
      Math.floor(cartonLength / a) *
      Math.floor(cartonWidth / b) *
      Math.floor(cartonHeight / c);
    if (fit > best) best = fit;
  }
  return best;
}

export type AirCartonLimit = "volume" | "weight" | "both" | "none";

/**
 * Air carton fill for volumetric shipping:
 * - volume: how many closed boxes fit in 21×17×16 in (any orientation)
 * - weight: floor(maxKg / perUnitKg) with safety max (default 22 kg)
 * - unitsPerCarton = min(volume, weight)
 * - cartonsNeeded = ceil(quantity / unitsPerCarton)
 */
export function calcAirCartonPacking(opts: {
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  perUnitKg: number;
  quantity: number;
  cartonLengthIn: number;
  cartonWidthIn: number;
  cartonHeightIn: number;
  cartonMaxKg: number;
}): {
  unitsByVolume: number;
  unitsByWeight: number;
  unitsPerCarton: number;
  cartonsNeeded: number;
  limitedBy: AirCartonLimit;
} | null {
  const {
    boxLengthIn,
    boxWidthIn,
    boxHeightIn,
    perUnitKg,
    quantity,
    cartonLengthIn,
    cartonWidthIn,
    cartonHeightIn,
    cartonMaxKg,
  } = opts;

  if (!Number.isFinite(perUnitKg) || perUnitKg <= 0) return null;
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!(cartonMaxKg > 0) || !Number.isFinite(cartonMaxKg)) return null;

  const unitsByVolume = calcBoxesPerCartonByVolume(
    boxLengthIn,
    boxWidthIn,
    boxHeightIn,
    cartonLengthIn,
    cartonWidthIn,
    cartonHeightIn,
  );
  const unitsByWeight = Math.floor(cartonMaxKg / perUnitKg);

  if (unitsByVolume < 1 || unitsByWeight < 1) {
    return {
      unitsByVolume,
      unitsByWeight,
      unitsPerCarton: 0,
      cartonsNeeded: 0,
      limitedBy: "none",
    };
  }

  const unitsPerCarton = Math.min(unitsByVolume, unitsByWeight);
  const cartonsNeeded = Math.ceil(quantity / unitsPerCarton);
  const limitedBy: AirCartonLimit =
    unitsByVolume === unitsByWeight
      ? "both"
      : unitsByVolume < unitsByWeight
        ? "volume"
        : "weight";

  return {
    unitsByVolume,
    unitsByWeight,
    unitsPerCarton,
    cartonsNeeded,
    limitedBy,
  };
}
