import type { MailerCorrugationConfig } from "../mailerCostConfig";
import { roundMoney } from "../currency";

export interface MailerCorrugationCostResult {
  perUnit: number;
  total: number;
  totalPcsPerRoll: number;
  totalRolls: number;
  corrugationCost: number;
  pastingCost: number;
  ratePerRoll: number;
  pastingPerSheet: number;
  totalSheets: number;
  paddedOpenWidthIn: number;
  paddedOpenHeightIn: number;
}

/**
 * Mailer corrugation cost (multi-step):
 * 1. Total Pcs / Roll = rollCapacity / paddedWidth
 * 2. Total Rolls = quantity / (Total Pcs / Roll)
 * 3. Corrugation Cost = Total Rolls × ratePerRoll × paddedLength
 * 4. Pasting = totalSheets × pastingPerSheet
 * Total = Corrugation Cost + Pasting
 */
export function calcMailerCorrugationCost(
  paddedOpenWidthIn: number,
  paddedOpenHeightIn: number,
  quantity: number,
  totalSheets: number,
  config: MailerCorrugationConfig,
): MailerCorrugationCostResult | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!Number.isInteger(totalSheets) || totalSheets < 1) return null;
  if (
    ![
      paddedOpenWidthIn,
      paddedOpenHeightIn,
      config.ratePerRoll,
      config.rollCapacity,
      config.pastingPerSheet,
    ].every((n) => Number.isFinite(n) && n > 0)
  ) {
    return null;
  }

  // 1. Total Pcs / Roll = rollCapacity / width
  const totalPcsPerRoll = config.rollCapacity / paddedOpenWidthIn;

  // 2. Total Rolls = quantity / (Pcs per Roll)
  const totalRolls = quantity / totalPcsPerRoll;

  // 3. Corrugation Cost = rolls × rate × length
  const corrugationCost = totalRolls * config.ratePerRoll * paddedOpenHeightIn;

  // 4. Pasting = sheets × rate per sheet
  const pastingCost = totalSheets * config.pastingPerSheet;

  const total = roundMoney(corrugationCost + pastingCost);
  const perUnit = roundMoney(total / quantity);

  if (!Number.isFinite(total) || !Number.isFinite(perUnit)) return null;

  return {
    perUnit,
    total,
    totalPcsPerRoll: Math.round(totalPcsPerRoll * 100) / 100,
    totalRolls: Math.round(totalRolls * 100) / 100,
    corrugationCost: roundMoney(corrugationCost),
    pastingCost: roundMoney(pastingCost),
    ratePerRoll: config.ratePerRoll,
    pastingPerSheet: config.pastingPerSheet,
    totalSheets,
    paddedOpenWidthIn,
    paddedOpenHeightIn,
  };
}
