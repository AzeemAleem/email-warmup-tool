import { roundMoney } from "../currency";
import type { CostItemModule, CostLineResult } from "../types";
import { calcGreyboardPerUnit } from "./greyboardCost";

/**
 * Labor defaults to the same total as Greyboard (per unit × quantity).
 * Manual override replaces the total.
 */
export function calcLaborCost(
  openWidthIn: number,
  openHeightIn: number,
  quantity: number,
  greyboardConfig: {
    gsm: number;
    factor: number;
    divisor: number;
    scale: number;
    markup: number;
  },
  manualTotal: number | null,
): {
  total: number;
  perUnit: number;
  usedAutomatic: boolean;
  greyboardTotal: number;
} | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;

  const gbPerUnit = calcGreyboardPerUnit(
    openWidthIn,
    openHeightIn,
    greyboardConfig,
  );
  if (gbPerUnit == null) return null;

  const greyboardTotal = roundMoney(gbPerUnit * quantity);
  if (!Number.isFinite(greyboardTotal)) return null;

  const usedAutomatic = !(
    manualTotal != null &&
    Number.isFinite(manualTotal) &&
    manualTotal >= 0
  );
  const total = usedAutomatic ? greyboardTotal : roundMoney(manualTotal!);
  if (!Number.isFinite(total) || total < 0) return null;

  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;

  return { total, perUnit, usedAutomatic, greyboardTotal };
}

export function parseLaborTotal(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export const laborCostItem: CostItemModule = {
  id: "labor",
  label: "Labor",
  calculate(ctx): CostLineResult | null {
    const {
      openSizeIn,
      quantity,
      config,
      laborEnabled,
      laborManualTotal,
    } = ctx;

    if (!laborEnabled) return null;

    const result = calcLaborCost(
      openSizeIn.openWidthIn,
      openSizeIn.openHeightIn,
      quantity,
      config.greyboard,
      laborManualTotal,
    );
    if (!result) return null;

    return {
      id: "labor",
      label: "Labor",
      perUnit: result.perUnit,
      total: result.total,
      meta: {
        status: "ok",
        usedAutomatic: result.usedAutomatic,
        greyboardTotal: result.greyboardTotal,
      },
    };
  },
};
