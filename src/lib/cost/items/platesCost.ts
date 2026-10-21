import type { PlatesConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type {
  CostItemModule,
  CostLineResult,
  PrintColorMode,
  PrintSides,
} from "../types";
import { sidesMultiplier } from "./artPaperCost";
import { colorCount } from "./printingCost";

export type PlatesQtyTier = "base" | "mid" | "high";

/**
 * Quantity multiplier for plates:
 * - qty ≤ baseMaxQty → 1
 * - baseMaxQty < qty ≤ midMaxQty → 2
 * - qty > midMaxQty → 3
 */
export function platesQtyMultiplier(
  quantity: number,
  config: Pick<PlatesConfig, "baseMaxQty" | "midMaxQty">,
): { multiplier: number; tier: PlatesQtyTier } {
  const baseMax =
    config.baseMaxQty > 0 ? config.baseMaxQty : 1000;
  const midMax = config.midMaxQty > baseMax ? config.midMaxQty : 2500;

  if (quantity <= baseMax) return { multiplier: 1, tier: "base" };
  if (quantity <= midMax) return { multiplier: 2, tier: "mid" };
  return { multiplier: 3, tier: "high" };
}

/**
 * Printing plates cost:
 * plates = colors (1-color → 1 plate, CMYK → 4 plates)
 * oneSide = plates × costPerPlate
 * base = oneSide × sidesMultiplier
 *   e.g. CMYK double = 4 × 2000 × 2 = 16,000 PKR
 * total = base × qtyMultiplier (1 / 2 / 3 by quantity tier)
 */
export function calcPlatesCost(
  quantity: number,
  colorMode: PrintColorMode,
  printSides: PrintSides,
  config: PlatesConfig,
  manualTotal: number | null,
): {
  total: number;
  perUnit: number;
  usedAutomatic: boolean;
  colors: number;
  plates: number;
  sides: number;
  oneSideCost: number;
  baseTotal: number;
  qtyMultiplier: number;
  tier: PlatesQtyTier;
} | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const colors = colorCount(colorMode);
  const plates = colors;
  const sides = sidesMultiplier(printSides);
  const { costPerPlate } = config;
  if (!(plates >= 1) || !(sides >= 1) || !(costPerPlate > 0)) return null;

  const oneSideCost = plates * costPerPlate;
  const baseTotal = roundMoney(oneSideCost * sides);
  const { multiplier: qtyMultiplier, tier } = platesQtyMultiplier(
    quantity,
    config,
  );
  const automatic = roundMoney(baseTotal * qtyMultiplier);

  const usedAutomatic = !(
    manualTotal != null &&
    Number.isFinite(manualTotal) &&
    manualTotal >= 0
  );
  const total = usedAutomatic ? automatic : roundMoney(manualTotal!);
  if (!Number.isFinite(total) || total < 0) return null;

  const perUnit = roundMoney(total / quantity);
  if (!Number.isFinite(perUnit)) return null;

  return {
    total,
    perUnit,
    usedAutomatic,
    colors,
    plates,
    sides,
    oneSideCost,
    baseTotal,
    qtyMultiplier,
    tier,
  };
}

export function parsePlatesTotal(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export const platesCostItem: CostItemModule = {
  id: "plates",
  label: "Printing plates",
  calculate(ctx): CostLineResult | null {
    const {
      quantity,
      config,
      printSides,
      printColorMode,
      platesEnabled,
      platesManualTotal,
    } = ctx;

    if (!platesEnabled) return null;

    const result = calcPlatesCost(
      quantity,
      printColorMode,
      printSides,
      config.plates,
      platesManualTotal,
    );
    if (!result) return null;

    return {
      id: "plates",
      label: "Printing plates",
      perUnit: result.perUnit,
      total: result.total,
      meta: {
        status: "ok",
        usedAutomatic: result.usedAutomatic,
        colorMode: printColorMode,
        colors: result.colors,
        plates: result.plates,
        sides: result.sides,
        printSides,
        costPerPlate: config.plates.costPerPlate,
        oneSideCost: result.oneSideCost,
        baseTotal: result.baseTotal,
        qtyMultiplier: result.qtyMultiplier,
        tier: result.tier,
        baseMaxQty: config.plates.baseMaxQty,
        midMaxQty: config.plates.midMaxQty,
      },
    };
  },
};
