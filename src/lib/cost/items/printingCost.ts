import type { PrintingConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type {
  CostItemModule,
  CostLineResult,
  PrintColorMode,
  PrintSides,
} from "../types";
import { sidesMultiplier } from "./artPaperCost";

export function colorCount(mode: PrintColorMode): number {
  return mode === "cmyk" ? 4 : 1;
}

/**
 * Printing cost (total job, not per unit):
 * colors × costPerColor × sidesMultiplier
 * e.g. CMYK double = 4 × 3000 × 2 = 24,000 PKR
 */
export function calcPrintingCost(
  quantity: number,
  colorMode: PrintColorMode,
  printSides: PrintSides,
  config: PrintingConfig,
  manualTotal: number | null,
): {
  total: number;
  perUnit: number;
  usedAutomatic: boolean;
  colors: number;
  sides: number;
  oneSideCost: number;
} | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const colors = colorCount(colorMode);
  const sides = sidesMultiplier(printSides);
  const { costPerColor } = config;
  if (!(colors >= 1) || !(sides >= 1) || !(costPerColor > 0)) return null;

  const oneSideCost = colors * costPerColor;
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

  return { total, perUnit, usedAutomatic, colors, sides, oneSideCost };
}

export function parsePrintingTotal(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export const printingCostItem: CostItemModule = {
  id: "printing",
  label: "Printing",
  calculate(ctx): CostLineResult | null {
    const {
      quantity,
      config,
      printSides,
      printColorMode,
      printingEnabled,
      printingManualTotal,
    } = ctx;

    if (!printingEnabled) return null;

    const result = calcPrintingCost(
      quantity,
      printColorMode,
      printSides,
      config.printing,
      printingManualTotal,
    );
    if (!result) return null;

    return {
      id: "printing",
      label: "Printing",
      perUnit: result.perUnit,
      total: result.total,
      meta: {
        status: "ok",
        usedAutomatic: result.usedAutomatic,
        colorMode: printColorMode,
        colors: result.colors,
        sides: result.sides,
        printSides,
        costPerColor: config.printing.costPerColor,
        oneSideCost: result.oneSideCost,
      },
    };
  },
};
