import type { MailerStockConfig } from "../mailerCostConfig";
import { roundMoney } from "../currency";

export interface MailerStockCostResult {
  perUnit: number;
  total: number;
  materialType: "cardboard" | "kraft";
  materialRate: number;
  gsm: number;
  totalSheets: number;
  paddedOpenWidthIn: number;
  paddedOpenHeightIn: number;
}

/**
 * Mailer stock cost calculation:
 * - Add padding (default 2 inches) to both open size dimensions
 * - Formula: (length × width × GSM × total sheets) / 15500 / 100
 * - Rate depends on material type (cardboard or kraft)
 */
export function calcMailerStockCost(
  openWidthIn: number,
  openHeightIn: number,
  quantity: number,
  totalSheets: number,
  config: MailerStockConfig,
): MailerStockCostResult | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!Number.isInteger(totalSheets) || totalSheets < 1) return null;
  if (
    ![openWidthIn, openHeightIn, config.gsm, config.paddingIn].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }

  const paddedWidth = openWidthIn + config.paddingIn;
  const paddedHeight = openHeightIn + config.paddingIn;

  const materialRate =
    config.materialType === "cardboard"
      ? config.cardboardRate
      : config.kraftRate;

  // Weight unit: (L × W × GSM × sheets) / 15500 / 100
  // Stock cost = weight × material rate (Cardboard 550 / Kraft 450 PKR)
  const weightUnit =
    (paddedWidth * paddedHeight * config.gsm * totalSheets) / 15500 / 100;
  const total = roundMoney(weightUnit * materialRate);
  const perUnit = roundMoney(total / quantity);

  if (!Number.isFinite(total) || !Number.isFinite(perUnit)) return null;

  return {
    perUnit,
    total,
    materialType: config.materialType,
    materialRate,
    gsm: config.gsm,
    totalSheets,
    paddedOpenWidthIn: paddedWidth,
    paddedOpenHeightIn: paddedHeight,
  };
}
