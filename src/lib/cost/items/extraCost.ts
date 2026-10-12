import { roundMoney } from "../currency";
import type { CostItemModule, CostLineResult } from "../types";

/** Parse Extra expenses total (PKR). Empty → null (omit line). */
export function parseExtraTotal(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Optional lump-sum extra expenses (PKR) added into the grand total.
 * Omitted when amount is null or zero.
 */
export function calcExtraCost(
  quantity: number,
  amount: number,
): { total: number; perUnit: number } | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const total = roundMoney(amount);
  if (!Number.isFinite(total) || total <= 0) return null;

  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;

  return { total, perUnit };
}

export const extraCostItem: CostItemModule = {
  id: "extra",
  label: "Extra",
  calculate(ctx): CostLineResult | null {
    const amount = ctx.extraTotal;
    if (amount == null) return null;

    const result = calcExtraCost(ctx.quantity, amount);
    if (!result) return null;

    return {
      id: "extra",
      label: "Extra",
      perUnit: result.perUnit,
      total: result.total,
      meta: { status: "ok" },
    };
  },
};
