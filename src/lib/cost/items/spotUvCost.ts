import type { SpotUvConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type { CostItemModule, CostLineResult } from "../types";

export type SpotUvMode = "automatic" | "manual" | "needs_input";

export interface SpotUvCalcResult {
  mode: SpotUvMode;
  total: number | null;
  perUnit: number | null;
  usedAutomatic: boolean;
}

/**
 * Spot UV is an estimated/base total (not per-unit formula).
 * qty <= fixedMaxQty → automatic fixedCost (optional manual override).
 * qty > fixedMaxQty → manual total required.
 */
export function calcSpotUvCost(
  quantity: number,
  config: SpotUvConfig,
  manualTotal: number | null,
): SpotUvCalcResult {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { mode: "needs_input", total: null, perUnit: null, usedAutomatic: false };
  }

  const canUseAutomatic = quantity <= config.fixedMaxQty;

  if (manualTotal != null && Number.isFinite(manualTotal) && manualTotal >= 0) {
    const total = roundMoney(manualTotal);
    const perUnit = roundMoney(total / quantity);
    return {
      mode: "manual",
      total,
      perUnit: Number.isFinite(perUnit) ? perUnit : null,
      usedAutomatic: false,
    };
  }

  if (canUseAutomatic) {
    const total = roundMoney(config.fixedCost);
    const perUnit = roundMoney(total / quantity);
    return {
      mode: "automatic",
      total,
      perUnit: Number.isFinite(perUnit) ? perUnit : null,
      usedAutomatic: true,
    };
  }

  return {
    mode: "needs_input",
    total: null,
    perUnit: null,
    usedAutomatic: false,
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

    if (result.mode === "needs_input" || result.total == null) {
      return {
        id: "spotUv",
        label: "Spot UV",
        perUnit: 0,
        total: 0,
        excluded: true,
        warning: "Enter Spot UV cost",
        meta: {
          status: "needs_input",
          estimate: true,
          fixedMaxQty: config.spotUv.fixedMaxQty,
          fixedCost: config.spotUv.fixedCost,
        },
      };
    }

    return {
      id: "spotUv",
      label: "Spot UV",
      perUnit: result.perUnit ?? 0,
      total: result.total,
      meta: {
        status: "ok",
        estimate: true,
        mode: result.mode,
        usedAutomatic: result.usedAutomatic,
        fixedMaxQty: config.spotUv.fixedMaxQty,
        fixedCost: config.spotUv.fixedCost,
      },
    };
  },
};
