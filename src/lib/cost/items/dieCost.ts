import type { DieConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type { CostItemModule, CostLineResult } from "../types";

/**
 * Die making + die cutting: fixed total (default 5,000 PKR), overridable.
 */
export function calcDieCost(
  quantity: number,
  config: DieConfig,
  manualTotal: number | null,
): { total: number; perUnit: number; usedAutomatic: boolean } | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;

  const total =
    manualTotal != null && Number.isFinite(manualTotal) && manualTotal >= 0
      ? roundMoney(manualTotal)
      : roundMoney(config.fixedCost);

  if (!Number.isFinite(total) || total < 0) return null;

  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;

  return {
    total,
    perUnit,
    usedAutomatic: !(
      manualTotal != null &&
      Number.isFinite(manualTotal) &&
      manualTotal >= 0
    ),
  };
}

/** Parse die total input: empty → null; non-negative finite number OK. */
export function parseDieTotal(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export const dieCostItem: CostItemModule = {
  id: "die",
  label: "Die making + Die cutting",
  calculate(ctx): CostLineResult | null {
    const { quantity, config, dieEnabled, dieManualTotal } = ctx;

    if (!dieEnabled) return null;

    const result = calcDieCost(quantity, config.die, dieManualTotal);
    if (!result) return null;

    return {
      id: "die",
      label: "Die making + Die cutting",
      perUnit: result.perUnit,
      total: result.total,
      meta: {
        status: "ok",
        usedAutomatic: result.usedAutomatic,
        fixedCost: config.die.fixedCost,
      },
    };
  },
};
