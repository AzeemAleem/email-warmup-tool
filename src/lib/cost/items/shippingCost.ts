import type { ShippingConfig, ShippingWeightMode } from "../costConfig";
import { DEFAULT_SHIPPING_CONFIG } from "../costConfig";
import { DEFAULT_AIR_CARTONS } from "../airCartons";
import { roundMoney } from "../currency";
import type { ClosedBoxCm, CostItemModule, CostLineResult } from "../types";
import {
  calcTotalWeightKg,
  calcVolumetricWeightPerUnitKg,
  calcWeightPerUnitKg,
  roundWeightKg,
  selectBestAirCarton,
  type AirCartonCandidate,
  type AirCartonLimit,
} from "./weightCalc";

export type { ClosedBoxCm };

export interface AirCartonPackingResult {
  id: string;
  label: string;
  unitsByVolume: number;
  unitsByWeight: number;
  unitsPerCarton: number;
  cartonsNeeded: number;
  limitedBy: AirCartonLimit;
  emptyVolumePct: number;
  emptyWeightKg: number;
  emptySlots: number;
  chargeableKg: number;
  cartonLengthIn: number;
  cartonWidthIn: number;
  cartonHeightIn: number;
  cartonMaxKg: number;
  labeledKg: number;
}

function candidateToResult(c: AirCartonCandidate): AirCartonPackingResult {
  return {
    id: c.id,
    label: c.label,
    unitsByVolume: c.unitsByVolume,
    unitsByWeight: c.unitsByWeight,
    unitsPerCarton: c.unitsPerCarton,
    cartonsNeeded: c.cartonsNeeded,
    limitedBy: c.limitedBy,
    emptyVolumePct: c.emptyVolumePct,
    emptyWeightKg: c.emptyWeightKg,
    emptySlots: c.emptySlots,
    chargeableKg: c.chargeableKg,
    cartonLengthIn: c.lengthIn,
    cartonWidthIn: c.widthIn,
    cartonHeightIn: c.heightIn,
    /** Max fill capacity (safety), e.g. 22 for 25 kg carton */
    cartonMaxKg: c.billedKg,
    /** Carton rating used for chargeable billing */
    labeledKg: c.labeledKg,
  };
}

/**
 * Shipping = chargeableKg × ratePerKg (PKR).
 *
 * Volumetric: evaluate all air cartons, pick lowest chargeable
 * (cartonsNeeded × labeledKg). Fill capacity uses billedKg (e.g. 22);
 * billing uses the carton rating (e.g. 25).
 */
export function calcShippingCost(
  openWidthIn: number,
  openHeightIn: number,
  quantity: number,
  weightConfig: { gsm: number; divisor: number; scale: number },
  shippingConfig: ShippingConfig,
  closedBoxCm: ClosedBoxCm | null = null,
): {
  perUnitKg: number;
  productTotalKg: number;
  totalKg: number;
  total: number;
  perUnit: number;
  ratePerKg: number;
  weightMode: ShippingWeightMode;
  airCarton: AirCartonPackingResult | null;
  airCartonOptions: AirCartonPackingResult[];
} | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const ratePerKg = shippingConfig.ratePerKg;
  const weightMode: ShippingWeightMode =
    shippingConfig.weightMode === "volumetric" ? "volumetric" : "actual";
  const volumetricDivisor =
    shippingConfig.volumetricDivisor > 0
      ? shippingConfig.volumetricDivisor
      : 5000;
  if (!(ratePerKg >= 0) || !Number.isFinite(ratePerKg)) return null;

  let perUnitKg: number | null = null;

  if (weightMode === "volumetric") {
    if (
      !closedBoxCm ||
      ![
        closedBoxCm.lengthCm,
        closedBoxCm.widthCm,
        closedBoxCm.heightCm,
      ].every((n) => Number.isFinite(n) && n > 0)
    ) {
      return null;
    }
    perUnitKg = calcVolumetricWeightPerUnitKg(
      closedBoxCm.lengthCm,
      closedBoxCm.widthCm,
      closedBoxCm.heightCm,
      volumetricDivisor,
    );
  } else {
    perUnitKg = calcWeightPerUnitKg(
      openWidthIn,
      openHeightIn,
      weightConfig,
    );
  }
  if (perUnitKg == null) return null;

  const productTotalKg = calcTotalWeightKg(perUnitKg, quantity);
  if (productTotalKg == null) return null;

  let airCarton: AirCartonPackingResult | null = null;
  let airCartonOptions: AirCartonPackingResult[] = [];
  let chargeableKg = productTotalKg;

  if (weightMode === "volumetric" && closedBoxCm) {
    const catalog =
      shippingConfig.airCartons?.length > 0
        ? shippingConfig.airCartons
        : DEFAULT_SHIPPING_CONFIG.airCartons?.length
          ? DEFAULT_SHIPPING_CONFIG.airCartons
          : [...DEFAULT_AIR_CARTONS];

    const { best, options } = selectBestAirCarton({
      boxLengthIn: closedBoxCm.lengthCm / 2.54,
      boxWidthIn: closedBoxCm.widthCm / 2.54,
      boxHeightIn: closedBoxCm.heightCm / 2.54,
      perUnitKg,
      quantity,
      cartons: catalog,
    });

    airCartonOptions = options.map(candidateToResult);
    if (!best) return null;

    airCarton = candidateToResult(best);
    chargeableKg = best.chargeableKg;
  }

  const total = roundMoney(chargeableKg * ratePerKg);
  if (!Number.isFinite(total)) return null;

  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;

  return {
    perUnitKg: roundWeightKg(perUnitKg, 6),
    productTotalKg: roundWeightKg(productTotalKg, 4),
    totalKg: roundWeightKg(chargeableKg, 4),
    total,
    perUnit,
    ratePerKg,
    weightMode,
    airCarton,
    airCartonOptions,
  };
}

export const shippingCostItem: CostItemModule = {
  id: "shipping",
  label: "Shipping",
  calculate(ctx): CostLineResult | null {
    const { openSizeIn, quantity, config, closedBoxCm } = ctx;

    const result = calcShippingCost(
      openSizeIn.openWidthIn,
      openSizeIn.openHeightIn,
      quantity,
      config.weight,
      config.shipping,
      closedBoxCm,
    );
    if (!result) return null;

    return {
      id: "shipping",
      label: "Shipping",
      perUnit: result.perUnit,
      total: result.total,
      meta: {
        status: "ok",
        weightMode: result.weightMode,
        openWidthIn: openSizeIn.openWidthIn,
        openHeightIn: openSizeIn.openHeightIn,
        lengthCm: closedBoxCm?.lengthCm ?? 0,
        widthCm: closedBoxCm?.widthCm ?? 0,
        heightCm: closedBoxCm?.heightCm ?? 0,
        perUnitKg: result.perUnitKg,
        productTotalKg: result.productTotalKg,
        totalKg: result.totalKg,
        ratePerKg: result.ratePerKg,
        gsm: config.weight.gsm,
        divisor: config.weight.divisor,
        scale: config.weight.scale,
        volumetricDivisor: config.shipping.volumetricDivisor,
        bestCartonId: result.airCarton?.id ?? "",
        bestCartonLabel: result.airCarton?.label ?? "",
        airCartonLengthIn: result.airCarton?.cartonLengthIn ?? 0,
        airCartonWidthIn: result.airCarton?.cartonWidthIn ?? 0,
        airCartonHeightIn: result.airCarton?.cartonHeightIn ?? 0,
        airCartonMaxKg: result.airCarton?.cartonMaxKg ?? 0,
        airCartonLabeledKg: result.airCarton?.labeledKg ?? 0,
        chargeablePerCartonKg: result.airCarton?.labeledKg ?? 0,
        unitsByVolume: result.airCarton?.unitsByVolume ?? 0,
        unitsByWeight: result.airCarton?.unitsByWeight ?? 0,
        unitsPerCarton: result.airCarton?.unitsPerCarton ?? 0,
        cartonsNeeded: result.airCarton?.cartonsNeeded ?? 0,
        cartonLimitedBy: result.airCarton?.limitedBy ?? "none",
        emptyVolumePct: result.airCarton?.emptyVolumePct ?? 0,
        emptyWeightKg: result.airCarton?.emptyWeightKg ?? 0,
        emptySlots: result.airCarton?.emptySlots ?? 0,
        // JSON list of all carton options for UI comparison table
        airCartonOptionsJson: JSON.stringify(result.airCartonOptions),
      },
    };
  },
};
