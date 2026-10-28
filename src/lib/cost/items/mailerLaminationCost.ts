import type { MailerLaminationConfig } from "../mailerCostConfig";
import { roundMoney } from "../currency";

export interface MailerLaminationCostResult {
  perUnit: number;
  total: number;
  sides: number;
  rate: number;
  totalSheets: number;
  paddedOpenWidthIn: number;
  paddedOpenHeightIn: number;
}

/**
 * Mailer lamination cost:
 * Formula: (length × width / divisor) × rate × total sheets × sides
 * Default: (L × W / 144) × 4.5 × sheets × sides
 * Sides: 0 (none), 1 (default), or 2
 */
export function calcMailerLaminationCost(
  paddedOpenWidthIn: number,
  paddedOpenHeightIn: number,
  quantity: number,
  totalSheets: number,
  sides: number,
  config: MailerLaminationConfig,
): MailerLaminationCostResult | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!Number.isInteger(totalSheets) || totalSheets < 1) return null;
  if (!Number.isInteger(sides) || sides < 0 || sides > 2) return null;
  if (
    ![paddedOpenWidthIn, paddedOpenHeightIn, config.rate, config.divisor].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }

  if (sides === 0) {
    return {
      perUnit: 0,
      total: 0,
      sides: 0,
      rate: config.rate,
      totalSheets,
      paddedOpenWidthIn,
      paddedOpenHeightIn,
    };
  }

  // Formula: (L × W / divisor) × rate × sheets × sides
  const rawCost =
    ((paddedOpenWidthIn * paddedOpenHeightIn) / config.divisor) *
    config.rate *
    totalSheets *
    sides;
  const total = roundMoney(rawCost);
  const perUnit = roundMoney(total / quantity);

  if (!Number.isFinite(total) || !Number.isFinite(perUnit)) return null;

  return {
    perUnit,
    total,
    sides,
    rate: config.rate,
    totalSheets,
    paddedOpenWidthIn,
    paddedOpenHeightIn,
  };
}
