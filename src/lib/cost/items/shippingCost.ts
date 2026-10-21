import type { ShippingConfig, ShippingWeightMode } from "../costConfig";
import { roundMoney } from "../currency";
import type { ClosedBoxCm, CostItemModule, CostLineResult } from "../types";
import {
  calcTotalWeightKg,
  calcVolumetricWeightPerUnitKg,
  calcWeightPerUnitKg,
  roundWeightKg,
} from "./weightCalc";

export type { ClosedBoxCm };

/**
 * Shipping = totalWeightKg × ratePerKg (PKR).
 *
 * Weight modes:
 * - actual: open size (no pad) GSM formula
 * - volumetric: (L × W × H in cm) / volumetricDivisor
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
  totalKg: number;
  total: number;
  perUnit: number;
  ratePerKg: number;
  weightMode: ShippingWeightMode;
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

  const totalKg = calcTotalWeightKg(perUnitKg, quantity);
  if (totalKg == null) return null;

  const total = roundMoney(totalKg * ratePerKg);
  if (!Number.isFinite(total)) return null;

  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;

  return {
    perUnitKg: roundWeightKg(perUnitKg, 6),
    totalKg: roundWeightKg(totalKg, 4),
    total,
    perUnit,
    ratePerKg,
    weightMode,
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
        totalKg: result.totalKg,
        ratePerKg: result.ratePerKg,
        gsm: config.weight.gsm,
        divisor: config.weight.divisor,
        scale: config.weight.scale,
        volumetricDivisor: config.shipping.volumetricDivisor,
      },
    };
  },
};
