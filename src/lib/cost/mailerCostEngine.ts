import type { MailerCostConfig } from "./mailerCostConfig";
import {
  calcMailerStockCost,
  roundPaddedInches,
} from "./items/mailerStockCost";
import { calcMailerLaminationCost } from "./items/mailerLaminationCost";
import { calcMailerCorrugationCost } from "./items/mailerCorrugationCost";
import { calcMailerShippingCost } from "./items/mailerShippingCost";
import { calcExtraCost } from "./items/extraCost";
import { roundMoney } from "./currency";
import type { CostEngineResult, CostLineResult } from "./types";

export type MailerCostLineResult = CostLineResult;
export type MailerCostEngineResult = CostEngineResult;

export interface MailerCostExtras {
  totalSheetsOverride: number | null;
  laminationSides: number;
  stockManualTotal: number | null;
  laminationManualTotal: number | null;
  platesManualTotal: number | null;
  printingManualTotal: number | null;
  dieManualTotal: number | null;
  cuttingManualTotal: number | null;
  pastingManualTotal: number | null;
  corrugationManualTotal: number | null;
  shippingManualTotal: number | null;
  /** Optional lump-sum Extra (PKR) added to production cost */
  extraTotal: number | null;
  /** When false, skip corrugation entirely from the grand total */
  corrugationEnabled: boolean;
  printColorMode: "one" | "cmyk";
}

/**
 * Total sheets for mailer boxes:
 * outside (qty) + inside (qty) + 200 extra.
 * Example: 300 units → 300 + 300 + 200 = 800 sheets.
 */
export function calcMailerTotalSheets(quantity: number): number | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  return quantity * 2 + 200;
}

/**
 * Mailer box cost engine: orchestrates all cost calculations.
 */
export function runMailerCostEngine(
  openWidthIn: number,
  openHeightIn: number,
  quantity: number,
  piecesPerSheet: number | null,
  config: MailerCostConfig,
  extras: MailerCostExtras,
): MailerCostEngineResult | null {
  if (
    ![openWidthIn, openHeightIn].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }
  if (!Number.isInteger(quantity) || quantity < 1) return null;

  const items: MailerCostLineResult[] = [];
  const warnings: string[] = [];

  let totalSheets =
    extras.totalSheetsOverride ?? calcMailerTotalSheets(quantity);

  if (totalSheets == null || totalSheets < 1) {
    totalSheets = quantity * 2 + 200;
    warnings.push("Using default sheet formula: qty×2 + 200 extra.");
  }

  const colors = extras.printColorMode === "cmyk" ? 4 : 1;

  // 1. Stock Cost
  const stockCalc = calcMailerStockCost(
    openWidthIn,
    openHeightIn,
    quantity,
    totalSheets,
    config.stock,
  );
  const paddedOpenWidthIn = stockCalc
    ? stockCalc.paddedOpenWidthIn
    : roundPaddedInches(openWidthIn + config.stock.paddingIn);
  const paddedOpenHeightIn = stockCalc
    ? stockCalc.paddedOpenHeightIn
    : roundPaddedInches(openHeightIn + config.stock.paddingIn);

  if (stockCalc || extras.stockManualTotal != null) {
    const usedAutomatic = extras.stockManualTotal == null;
    const autoTotal = stockCalc?.total ?? 0;
    const total = extras.stockManualTotal ?? autoTotal;
    items.push({
      id: "stock",
      label: "Stock Cost",
      perUnit: roundMoney(total / quantity),
      total,
      meta: {
        materialType: stockCalc?.materialType ?? config.stock.materialType,
        materialRate:
          stockCalc?.materialRate ??
          (config.stock.materialType === "cardboard"
            ? config.stock.cardboardRate
            : config.stock.kraftRate),
        gsm: stockCalc?.gsm ?? config.stock.gsm,
        totalSheets,
        paddedOpenWidthIn,
        paddedOpenHeightIn,
        piecesPerSheet: piecesPerSheet ?? 1,
        autoTotal,
        usedAutomatic,
      },
    });
  }

  // 2. Lamination
  const laminationCalc = calcMailerLaminationCost(
    paddedOpenWidthIn,
    paddedOpenHeightIn,
    quantity,
    totalSheets,
    extras.laminationSides,
    config.lamination,
  );
  if (
    (laminationCalc && laminationCalc.sides > 0) ||
    extras.laminationManualTotal != null
  ) {
    const usedAutomatic = extras.laminationManualTotal == null;
    const autoTotal = laminationCalc?.total ?? 0;
    const total = extras.laminationManualTotal ?? autoTotal;
    if (total > 0 || extras.laminationSides > 0) {
      items.push({
        id: "lamination",
        label: "Lamination",
        perUnit: roundMoney(total / quantity),
        total,
        meta: {
          sides: extras.laminationSides,
          rate: config.lamination.rate,
          divisor: config.lamination.divisor,
          totalSheets,
          autoTotal,
          usedAutomatic,
        },
      });
    }
  }

  // 3. Plates
  const platesAuto = (() => {
    if (quantity <= config.plates.baseMaxQty) {
      return colors * config.plates.costPerPlate;
    }
    if (quantity <= config.plates.midMaxQty) {
      return (colors * config.plates.costPerPlate) / 2;
    }
    return 0;
  })();
  const platesUsedAutomatic = extras.platesManualTotal == null;
  const platesTotal = extras.platesManualTotal ?? platesAuto;
  items.push({
    id: "plates",
    label: "Plates",
    perUnit: roundMoney(platesTotal / quantity),
    total: platesTotal,
    meta: {
      colorMode: extras.printColorMode,
      colors,
      plates: colors,
      costPerPlate: config.plates.costPerPlate,
      baseMaxQty: config.plates.baseMaxQty,
      midMaxQty: config.plates.midMaxQty,
      autoTotal: platesAuto,
      usedAutomatic: platesUsedAutomatic,
    },
  });

  // 4. Printing
  const printingAuto = colors * config.printing.costPerColor;
  const printingUsedAutomatic = extras.printingManualTotal == null;
  const printingTotal = extras.printingManualTotal ?? printingAuto;
  items.push({
    id: "printing",
    label: "Printing",
    perUnit: roundMoney(printingTotal / quantity),
    total: printingTotal,
    meta: {
      colorMode: extras.printColorMode,
      colors,
      costPerColor: config.printing.costPerColor,
      autoTotal: printingAuto,
      usedAutomatic: printingUsedAutomatic,
    },
  });

  // 5. Die
  const dieAuto = config.die.fixedCost;
  const dieUsedAutomatic = extras.dieManualTotal == null;
  const dieTotal = extras.dieManualTotal ?? dieAuto;
  items.push({
    id: "die",
    label: "Die",
    perUnit: roundMoney(dieTotal / quantity),
    total: dieTotal,
    meta: {
      autoTotal: dieAuto,
      usedAutomatic: dieUsedAutomatic,
    },
  });

  // 6. Cutting
  const cuttingAuto = config.cutting.fixedCost;
  const cuttingUsedAutomatic = extras.cuttingManualTotal == null;
  const cuttingTotal = extras.cuttingManualTotal ?? cuttingAuto;
  items.push({
    id: "cutting",
    label: "Cutting",
    perUnit: roundMoney(cuttingTotal / quantity),
    total: cuttingTotal,
    meta: {
      autoTotal: cuttingAuto,
      usedAutomatic: cuttingUsedAutomatic,
    },
  });

  // 7. Pasting (finishing)
  const pastingAuto = config.pasting.fixedCost;
  const pastingUsedAutomatic = extras.pastingManualTotal == null;
  const pastingTotal = extras.pastingManualTotal ?? pastingAuto;
  items.push({
    id: "pasting",
    label: "Pasting",
    perUnit: roundMoney(pastingTotal / quantity),
    total: pastingTotal,
    meta: {
      autoTotal: pastingAuto,
      usedAutomatic: pastingUsedAutomatic,
    },
  });

  // 8. Corrugation (optional)
  if (extras.corrugationEnabled) {
    const corrugationCalc = calcMailerCorrugationCost(
      paddedOpenWidthIn,
      paddedOpenHeightIn,
      quantity,
      totalSheets,
      config.corrugation,
    );
    if (corrugationCalc || extras.corrugationManualTotal != null) {
      const usedAutomatic = extras.corrugationManualTotal == null;
      const autoTotal = corrugationCalc?.total ?? 0;
      const total = extras.corrugationManualTotal ?? autoTotal;
      items.push({
        id: "corrugation",
        label: "Corrugation",
        perUnit: roundMoney(total / quantity),
        total,
        meta: {
          totalPcsPerRoll: corrugationCalc?.totalPcsPerRoll ?? 0,
          totalRolls: corrugationCalc?.totalRolls ?? 0,
          corrugationCost: corrugationCalc?.corrugationCost ?? 0,
          pastingCost: corrugationCalc?.pastingCost ?? 0,
          ratePerRoll: config.corrugation.ratePerRoll,
          pastingPerSheet: config.corrugation.pastingPerSheet,
          rollCapacity: config.corrugation.rollCapacity,
          paddedOpenWidthIn,
          paddedOpenHeightIn,
          totalSheets,
          autoTotal,
          usedAutomatic,
        },
      });
    }
  }

  // 9. Shipping — use padded (+2", rounded) dimensions; always include line
  {
    const shippingCalc = calcMailerShippingCost(
      paddedOpenWidthIn,
      paddedOpenHeightIn,
      quantity,
      config.shipping,
    );
    const usedAutomatic = extras.shippingManualTotal == null;
    const autoTotal = shippingCalc?.total ?? 0;
    const total = extras.shippingManualTotal ?? autoTotal;
    items.push({
      id: "shipping",
      label: "Shipping",
      perUnit: roundMoney(total / quantity),
      total,
      meta: {
        totalWeightKg: shippingCalc?.totalWeightKg ?? 0,
        ratePerKg: config.shipping.ratePerKg,
        gsm: config.shipping.gsm,
        openWidthIn: paddedOpenWidthIn,
        openHeightIn: paddedOpenHeightIn,
        paddedOpenWidthIn,
        paddedOpenHeightIn,
        autoTotal,
        usedAutomatic,
      },
    });
  }

  // 10. Extra (optional lump sum)
  if (extras.extraTotal != null && extras.extraTotal > 0) {
    const extra = calcExtraCost(quantity, extras.extraTotal);
    if (extra) {
      items.push({
        id: "extra",
        label: "Extra",
        perUnit: extra.perUnit,
        total: extra.total,
        meta: { status: "ok" },
      });
    }
  }

  const grandTotal = items
    .filter((i) => !i.excluded)
    .reduce((sum, i) => sum + i.total, 0);
  const costPerUnit = roundMoney(grandTotal / quantity);

  return {
    items,
    grandTotal: roundMoney(grandTotal),
    costPerUnit,
    warnings,
  };
}
