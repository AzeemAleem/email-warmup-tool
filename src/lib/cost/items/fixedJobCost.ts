import { roundMoney } from "../currency";
import type { CostContext, CostItemModule, CostLineResult } from "../types";

/**
 * Fixed job total (not per-unit formula), with optional manual override.
 */
export function calcFixedJobCost(
  quantity: number,
  fixedCost: number,
  manualTotal: number | null,
): { total: number; perUnit: number; usedAutomatic: boolean } | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!Number.isFinite(fixedCost) || fixedCost < 0) return null;

  const usedAutomatic = !(
    manualTotal != null &&
    Number.isFinite(manualTotal) &&
    manualTotal >= 0
  );
  const total = usedAutomatic
    ? roundMoney(fixedCost)
    : roundMoney(manualTotal!);
  if (!Number.isFinite(total) || total < 0) return null;

  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;

  return { total, perUnit, usedAutomatic };
}

export function parseFixedJobTotal(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function makeFixedJobCostItem(spec: {
  id: string;
  label: string;
  getEnabled: (ctx: CostContext) => boolean;
  getManualTotal: (ctx: CostContext) => number | null;
  getFixedCost: (ctx: CostContext) => number;
}): CostItemModule {
  return {
    id: spec.id,
    label: spec.label,
    calculate(ctx): CostLineResult | null {
      if (!spec.getEnabled(ctx)) return null;
      const fixedCost = spec.getFixedCost(ctx);
      const result = calcFixedJobCost(
        ctx.quantity,
        fixedCost,
        spec.getManualTotal(ctx),
      );
      if (!result) return null;
      return {
        id: spec.id,
        label: spec.label,
        perUnit: result.perUnit,
        total: result.total,
        meta: {
          status: "ok",
          usedAutomatic: result.usedAutomatic,
          fixedCost,
        },
      };
    },
  };
}
