import type { MailerShippingConfig } from "../mailerCostConfig";
import { roundMoney } from "../currency";

export interface MailerShippingCostResult {
  perUnit: number;
  total: number;
  totalWeightKg: number;
  ratePerKg: number;
  gsm: number;
  openWidthIn: number;
  openHeightIn: number;
}

/**
 * Mailer shipping cost:
 * Weight (kg) = (length × width × GSM × total units / 15500) / 100
 * Cost = weight × ratePerKg
 * Note: Uses different GSM (default 450) than stock calculation
 */
export function calcMailerShippingCost(
  openWidthIn: number,
  openHeightIn: number,
  quantity: number,
  config: MailerShippingConfig,
): MailerShippingCostResult | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (
    ![openWidthIn, openHeightIn, config.gsm, config.ratePerKg].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }

  // Weight = (L × W × GSM × qty / 15500) / 100
  const totalWeightKg =
    ((openWidthIn * openHeightIn * config.gsm * quantity) / 15500) / 100;

  const total = roundMoney(totalWeightKg * config.ratePerKg);
  const perUnit = roundMoney(total / quantity);

  if (!Number.isFinite(total) || !Number.isFinite(perUnit)) return null;

  return {
    perUnit,
    total,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    ratePerKg: config.ratePerKg,
    gsm: config.gsm,
    openWidthIn,
    openHeightIn,
  };
}
