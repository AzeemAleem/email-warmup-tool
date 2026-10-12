import type { ShippingConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type { CostItemModule, CostLineResult } from "../types";
import {
  calcTotalWeightKg,
  calcWeightPerUnitKg,
  roundWeightKg,
} from "./weightCalc";

/**
 * Shipping = totalWeightKg × ratePerKg (PKR).
 * Weight uses open size (no padding).
 */
export function calcShippingCost(
  openWidthIn: number,
  openHeightIn: number,
  quantity: number,
  weightConfig: { gsm: number; divisor: number; scale: number },
  shippingConfig: ShippingConfig,
): {
  perUnitKg: number;
  totalKg: number;
  total: number;
  perUnit: number;
  ratePerKg: number;
} | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const { ratePerKg } = shippingConfig;
  if (!(ratePerKg >= 0) || !Number.isFinite(ratePerKg)) return null;

  const perUnitKg = calcWeightPerUnitKg(
    openWidthIn,
    openHeightIn,
    weightConfig,
  );
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
  };
}

export const shippingCostItem: CostItemModule = {
  id: "shipping",
  label: "Shipping",
  calculate(ctx): CostLineResult | null {
    const { openSizeIn, quantity, config } = ctx;

    const result = calcShippingCost(
      openSizeIn.openWidthIn,
      openSizeIn.openHeightIn,
      quantity,
      config.weight,
      config.shipping,
    );
    if (!result) return null;

    return {
      id: "shipping",
      label: "Shipping",
      perUnit: result.perUnit,
      total: result.total,
      meta: {
        status: "ok",
        openWidthIn: openSizeIn.openWidthIn,
        openHeightIn: openSizeIn.openHeightIn,
        perUnitKg: result.perUnitKg,
        totalKg: result.totalKg,
        ratePerKg: result.ratePerKg,
        gsm: config.weight.gsm,
        divisor: config.weight.divisor,
        scale: config.weight.scale,
      },
    };
  },
};
