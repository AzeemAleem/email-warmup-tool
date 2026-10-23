import type { ShippingConfig, ShippingWeightMode } from "../costConfig";
import { DEFAULT_SHIPPING_CONFIG } from "../costConfig";
import { roundMoney } from "../currency";
import type { ClosedBoxCm, CostItemModule, CostLineResult } from "../types";
import {
  calcAirCartonPacking,
  calcTotalWeightKg,
  calcVolumetricWeightPerUnitKg,
  calcWeightPerUnitKg,
  roundWeightKg,
  type AirCartonLimit,
} from "./weightCalc";

export type { ClosedBoxCm };

export interface AirCartonPackingResult {
  unitsByVolume: number;
  unitsByWeight: number;
  unitsPerCarton: number;
  cartonsNeeded: number;
  limitedBy: AirCartonLimit;
  cartonLengthIn: number;
  cartonWidthIn: number;
  cartonHeightIn: number;
  cartonMaxKg: number;
}

/**
 * Shipping = chargeableKg × ratePerKg (PKR).
 *
 * Weight modes:
 * - actual: open size (no pad) GSM formula → chargeable = product weight
 * - volumetric: pack into air cartons (21×17×16 in).
 *   Each carton is billed at cartonMaxKg (22 kg safety), even if the
 *   product volumetric weight inside is lower (space is full).
 *   chargeableKg = cartonsNeeded × 22
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
  /** Product volumetric/actual total (informative) */
  productTotalKg: number;
  /** Chargeable weight used for shipping cost */
  totalKg: number;
  total: number;
  perUnit: number;
  ratePerKg: number;
  weightMode: ShippingWeightMode;
  airCarton: AirCartonPackingResult | null;
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
  let chargeableKg = productTotalKg;

  if (weightMode === "volumetric" && closedBoxCm) {
    const cartonLengthIn =
      shippingConfig.airCartonLengthIn > 0
        ? shippingConfig.airCartonLengthIn
        : DEFAULT_SHIPPING_CONFIG.airCartonLengthIn;
    const cartonWidthIn =
      shippingConfig.airCartonWidthIn > 0
        ? shippingConfig.airCartonWidthIn
        : DEFAULT_SHIPPING_CONFIG.airCartonWidthIn;
    const cartonHeightIn =
      shippingConfig.airCartonHeightIn > 0
        ? shippingConfig.airCartonHeightIn
        : DEFAULT_SHIPPING_CONFIG.airCartonHeightIn;
    const cartonMaxKg =
      shippingConfig.airCartonMaxKg > 0
        ? shippingConfig.airCartonMaxKg
        : DEFAULT_SHIPPING_CONFIG.airCartonMaxKg;

    // Closed box cm → inches for packing against carton inches
    const packing = calcAirCartonPacking({
      boxLengthIn: closedBoxCm.lengthCm / 2.54,
      boxWidthIn: closedBoxCm.widthCm / 2.54,
      boxHeightIn: closedBoxCm.heightCm / 2.54,
      perUnitKg,
      quantity,
      cartonLengthIn,
      cartonWidthIn,
      cartonHeightIn,
      cartonMaxKg,
    });
    if (!packing || packing.unitsPerCarton < 1 || packing.cartonsNeeded < 1) {
      return null;
    }
    airCarton = {
      ...packing,
      cartonLengthIn,
      cartonWidthIn,
      cartonHeightIn,
      cartonMaxKg,
    };
    // Carrier bills each used air carton at the safety chargeable weight (22 kg)
    chargeableKg = packing.cartonsNeeded * cartonMaxKg;
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
        airCartonLengthIn: result.airCarton?.cartonLengthIn ?? 0,
        airCartonWidthIn: result.airCarton?.cartonWidthIn ?? 0,
        airCartonHeightIn: result.airCarton?.cartonHeightIn ?? 0,
        airCartonMaxKg: result.airCarton?.cartonMaxKg ?? 0,
        unitsByVolume: result.airCarton?.unitsByVolume ?? 0,
        unitsByWeight: result.airCarton?.unitsByWeight ?? 0,
        unitsPerCarton: result.airCarton?.unitsPerCarton ?? 0,
        cartonsNeeded: result.airCarton?.cartonsNeeded ?? 0,
        cartonLimitedBy: result.airCarton?.limitedBy ?? "none",
      },
    };
  },
};
