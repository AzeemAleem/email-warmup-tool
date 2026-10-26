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

export interface AirCartonPackingStats {
  unitsByVolume: number;
  unitsByWeight: number;
  unitsPerCarton: number;
  cartonsNeeded: number;
  limitedBy: AirCartonLimit;
  /** Approximate unused volume % after packing unitsPerCarton boxes */
  emptyVolumePct: number;
  /** Unused kg capacity vs billed max */
  emptyWeightKg: number;
  /** Volume slots unused because of weight limit */
  emptySlots: number;
  chargeableKg: number;
}

/**
 * Air carton fill for volumetric shipping:
 * - volume: how many closed boxes fit (any orientation)
 * - weight: floor(maxFillKg / perUnitKg) — e.g. 25 kg carton fills to 22 kg
 * - unitsPerCarton = min(volume, weight)
 * - cartonsNeeded = ceil(quantity / unitsPerCarton)
 * - chargeableKg = cartonsNeeded × labeledKg (bill the full carton rating, not fill)
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
  /** Max product weight that fits (safety fill), e.g. 22 for a 25 kg carton */
  cartonMaxFillKg: number;
  /** Carton rating used for billing, e.g. 25 */
  chargeKgPerCarton: number;
}): AirCartonPackingStats | null {
  const {
    boxLengthIn,
    boxWidthIn,
    boxHeightIn,
    perUnitKg,
    quantity,
    cartonLengthIn,
    cartonWidthIn,
    cartonHeightIn,
    cartonMaxFillKg,
    chargeKgPerCarton,
  } = opts;

  if (!Number.isFinite(perUnitKg) || perUnitKg <= 0) return null;
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!(cartonMaxFillKg > 0) || !Number.isFinite(cartonMaxFillKg)) return null;
  if (!(chargeKgPerCarton > 0) || !Number.isFinite(chargeKgPerCarton)) return null;

  const unitsByVolume = calcBoxesPerCartonByVolume(
    boxLengthIn,
    boxWidthIn,
    boxHeightIn,
    cartonLengthIn,
    cartonWidthIn,
    cartonHeightIn,
  );
  const unitsByWeight = Math.floor(cartonMaxFillKg / perUnitKg);

  const cartonVol = cartonLengthIn * cartonWidthIn * cartonHeightIn;
  const boxVol = boxLengthIn * boxWidthIn * boxHeightIn;

  if (unitsByVolume < 1 || unitsByWeight < 1) {
    const limitedBy: AirCartonLimit =
      unitsByVolume < 1 && unitsByWeight < 1
        ? "both"
        : unitsByVolume < 1
          ? "volume"
          : "weight";
    return {
      unitsByVolume,
      unitsByWeight,
      unitsPerCarton: 0,
      cartonsNeeded: 0,
      limitedBy,
      emptyVolumePct: 100,
      emptyWeightKg: cartonMaxFillKg,
      emptySlots: Math.max(0, unitsByVolume),
      chargeableKg: 0,
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

  const usedVol = unitsPerCarton * boxVol;
  const emptyVolumePct =
    cartonVol > 0
      ? Math.max(0, Math.min(100, ((cartonVol - usedVol) / cartonVol) * 100))
      : 0;
  const emptyWeightKg = Math.max(0, cartonMaxFillKg - unitsPerCarton * perUnitKg);
  const emptySlots = Math.max(0, unitsByVolume - unitsPerCarton);

  return {
    unitsByVolume,
    unitsByWeight,
    unitsPerCarton,
    cartonsNeeded,
    limitedBy,
    emptyVolumePct: Math.round(emptyVolumePct * 10) / 10,
    emptyWeightKg: roundWeightKg(emptyWeightKg, 3),
    emptySlots,
    chargeableKg: roundWeightKg(cartonsNeeded * chargeKgPerCarton, 4),
  };
}

export interface AirCartonCandidate extends AirCartonPackingStats {
  id: string;
  label: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  labeledKg: number;
  billedKg: number;
  feasible: boolean;
}

/**
 * Evaluate every air carton and pick the lowest chargeable weight.
 * Ties: fewer cartons, then smaller labeled carton.
 */
export function selectBestAirCarton(opts: {
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  perUnitKg: number;
  quantity: number;
  cartons: readonly {
    id: string;
    label: string;
    lengthIn: number;
    widthIn: number;
    heightIn: number;
    labeledKg: number;
    billedKg: number;
  }[];
}): { best: AirCartonCandidate | null; options: AirCartonCandidate[] } {
  const options: AirCartonCandidate[] = opts.cartons.map((c) => {
    const packing = calcAirCartonPacking({
      boxLengthIn: opts.boxLengthIn,
      boxWidthIn: opts.boxWidthIn,
      boxHeightIn: opts.boxHeightIn,
      perUnitKg: opts.perUnitKg,
      quantity: opts.quantity,
      cartonLengthIn: c.lengthIn,
      cartonWidthIn: c.widthIn,
      cartonHeightIn: c.heightIn,
      cartonMaxFillKg: c.billedKg,
      chargeKgPerCarton: c.labeledKg,
    });
    const feasible =
      packing != null && packing.unitsPerCarton >= 1 && packing.cartonsNeeded >= 1;
    return {
      id: c.id,
      label: c.label,
      lengthIn: c.lengthIn,
      widthIn: c.widthIn,
      heightIn: c.heightIn,
      labeledKg: c.labeledKg,
      billedKg: c.billedKg,
      feasible,
      unitsByVolume: packing?.unitsByVolume ?? 0,
      unitsByWeight: packing?.unitsByWeight ?? 0,
      unitsPerCarton: packing?.unitsPerCarton ?? 0,
      cartonsNeeded: packing?.cartonsNeeded ?? 0,
      limitedBy: packing?.limitedBy ?? "none",
      emptyVolumePct: packing?.emptyVolumePct ?? 100,
      emptyWeightKg: packing?.emptyWeightKg ?? c.billedKg,
      emptySlots: packing?.emptySlots ?? 0,
      // Prefer packing chargeable; if packing null, 0
      chargeableKg: packing?.chargeableKg ?? 0,
    };
  });

  const feasible = options.filter((o) => o.feasible);
  feasible.sort((a, b) => {
    if (a.chargeableKg !== b.chargeableKg) return a.chargeableKg - b.chargeableKg;
    if (a.cartonsNeeded !== b.cartonsNeeded) return a.cartonsNeeded - b.cartonsNeeded;
    return a.labeledKg - b.labeledKg;
  });

  return { best: feasible[0] ?? null, options };
}
