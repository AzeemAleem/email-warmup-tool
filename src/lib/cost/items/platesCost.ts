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

/**
 * Printing plates cost:
 * plates = colors (1-color → 1 plate, CMYK → 4 plates)
 * oneSide = plates × costPerPlate
 * total = oneSide × sidesMultiplier
 * e.g. CMYK double = 4 × 2000 × 2 = 16,000 PKR
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
} | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const colors = colorCount(colorMode);
  const plates = colors;
  const sides = sidesMultiplier(printSides);
  const { costPerPlate } = config;
  if (!(plates >= 1) || !(sides >= 1) || !(costPerPlate > 0)) return null;

  const oneSideCost = plates * costPerPlate;
  const automatic = roundMoney(oneSideCost * sides);

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
      },
    };
  },
};
