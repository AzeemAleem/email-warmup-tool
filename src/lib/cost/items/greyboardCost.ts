import { roundMoney } from "../currency";
import type { CostItemModule, CostLineResult } from "../types";
import type { GreyboardConfig } from "../costConfig";

/**
 * Greyboard cost of 1 piece (open size in inches):
 * (((W × H × GSM × FACTOR) / DIVISOR) / SCALE) × MARKUP
 */
export function calcGreyboardPerUnit(
  openWidthIn: number,
  openHeightIn: number,
  config: GreyboardConfig,
): number | null {
  const { gsm, factor, divisor, scale, markup } = config;
  if (
    ![openWidthIn, openHeightIn, gsm, factor, divisor, scale, markup].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }

  const raw =
    (((openWidthIn * openHeightIn * gsm * factor) / divisor) / scale) * markup;

  if (!Number.isFinite(raw)) return null;
  return roundMoney(raw);
}

export const greyboardCostItem: CostItemModule = {
  id: "greyboard",
  label: "Greyboard",
  calculate(ctx): CostLineResult | null {
    const { openSizeIn, quantity, config } = ctx;
    if (!Number.isInteger(quantity) || quantity < 1) return null;

    const perUnit = calcGreyboardPerUnit(
      openSizeIn.openWidthIn,
      openSizeIn.openHeightIn,
      config.greyboard,
    );
    if (perUnit == null) return null;

    const total = roundMoney(perUnit * quantity);
    if (!Number.isFinite(total)) return null;

    return {
      id: "greyboard",
      label: "Greyboard",
      perUnit,
      total,
      meta: {
        openWidthIn: openSizeIn.openWidthIn,
        openHeightIn: openSizeIn.openHeightIn,
        gsm: config.greyboard.gsm,
      },
    };
  },
};
