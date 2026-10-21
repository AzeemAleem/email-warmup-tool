import type { SpotUvConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type { CostItemModule, CostLineResult } from "../types";

export type SpotUvMode = "automatic" | "manual";
export type SpotUvTier = "fixed" | "mid" | "high";

export interface SpotUvCalcResult {
  mode: SpotUvMode;
  tier: SpotUvTier;
  total: number;
  perUnit: number;
  usedAutomatic: boolean;
}

/**
 * Automatic Spot UV total for a quantity (ignores manual override).
 * - qty ≤ fixedMaxQty → fixedCost
 * - fixedMaxQty < qty ≤ midMaxQty → midRatePerUnit × qty
 * - qty > midMaxQty → highRatePerUnit × qty
 */
export function calcSpotUvAutomaticTotal(
  quantity: number,
  config: SpotUvConfig,
): { total: number; perUnit: number; tier: SpotUvTier } | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;

  const {
    fixedCost,
    fixedMaxQty,
    midMaxQty,
    midRatePerUnit,
    highRatePerUnit,
  } = config;

  let total: number;
  let tier: SpotUvTier;

  if (quantity <= fixedMaxQty) {
    total = roundMoney(fixedCost);
    tier = "fixed";
  } else if (quantity <= midMaxQty) {
    total = roundMoney(quantity * midRatePerUnit);
    tier = "mid";
  } else {
    total = roundMoney(quantity * highRatePerUnit);
    tier = "high";
  }

  if (!Number.isFinite(total)) return null;
  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;
  return { total, perUnit, tier };
}

export function spotUvTierLabel(
  tier: SpotUvTier,
  config: SpotUvConfig,
): string {
  if (tier === "fixed") {
    return `Fixed ≤ ${config.fixedMaxQty}`;
  }
  if (tier === "mid") {
    return `${config.midRatePerUnit} / unit (≤ ${config.midMaxQty})`;
  }
  return `${config.highRatePerUnit} / unit (> ${config.midMaxQty})`;
}

/**
 * Spot UV cost with optional manual override.
 * Automatic path always resolves for any valid quantity (tiered rates).
 */
export function calcSpotUvCost(
  quantity: number,
  config: SpotUvConfig,
  manualTotal: number | null,
): SpotUvCalcResult | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;

  if (manualTotal != null && Number.isFinite(manualTotal) && manualTotal >= 0) {
    const auto = calcSpotUvAutomaticTotal(quantity, config);
    const total = roundMoney(manualTotal);
    const perUnit = roundMoney(total / quantity);
    if (!Number.isFinite(perUnit)) return null;
    return {
      mode: "manual",
      tier: auto?.tier ?? "fixed",
      total,
      perUnit,
      usedAutomatic: false,
    };
  }

  const auto = calcSpotUvAutomaticTotal(quantity, config);
  if (!auto) return null;

  return {
    mode: "automatic",
    tier: auto.tier,
    total: auto.total,
    perUnit: auto.perUnit,
    usedAutomatic: true,
  };
}

/** Parse Spot UV total input: empty → null; non-negative finite number OK. */
export function parseSpotUvTotal(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export const spotUvCostItem: CostItemModule = {
  id: "spotUv",
  label: "Spot UV",
  calculate(ctx): CostLineResult | null {
    const { quantity, config, spotUvEnabled, spotUvManualTotal } = ctx;

    if (!spotUvEnabled) return null;

    const result = calcSpotUvCost(
      quantity,
      config.spotUv,
      spotUvManualTotal,
    );

    if (!result) return null;

    return {
      id: "spotUv",
      label: "Spot UV",
      perUnit: result.perUnit,
      total: result.total,
      meta: {
        status: "ok",
        estimate: true,
        mode: result.mode,
        tier: result.tier,
        usedAutomatic: result.usedAutomatic,
        fixedMaxQty: config.spotUv.fixedMaxQty,
        midMaxQty: config.spotUv.midMaxQty,
        fixedCost: config.spotUv.fixedCost,
        midRatePerUnit: config.spotUv.midRatePerUnit,
        highRatePerUnit: config.spotUv.highRatePerUnit,
      },
    };
  },
};
