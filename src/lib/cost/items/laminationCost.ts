import type { LaminationConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type {
  ArtSheetSelection,
  CostItemModule,
  CostLineResult,
  PrintSides,
} from "../types";
import { calcArtPiecesRequired } from "./artPaperCost";

/**
 * laminationPerSheet = ((sheetW × sheetH) / DIVISOR) × RATE, rounded to 2 decimals.
 * Uses the recommended art paper sheet size (e.g. 30×40), not open/art size.
 */
export function calcLaminationPerSheet(
  sheetWidth: number,
  sheetHeight: number,
  config: LaminationConfig,
): number | null {
  const { divisor, rate } = config;
  if (
    ![sheetWidth, sheetHeight, divisor, rate].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }
  const raw = ((sheetWidth * sheetHeight) / divisor) * rate;
  if (!Number.isFinite(raw)) return null;
  return roundMoney(raw);
}

export function calcLaminationCost(
  artSheet: ArtSheetSelection,
  quantity: number,
  printSides: PrintSides,
  extraSheets: number,
  config: LaminationConfig,
): { perSheet: number; laminationQty: number; total: number } | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!(artSheet.width > 0) || !(artSheet.height > 0)) return null;

  const perSheet = calcLaminationPerSheet(
    artSheet.width,
    artSheet.height,
    config,
  );
  if (perSheet == null) return null;

  const laminationQty = calcArtPiecesRequired(
    quantity,
    printSides,
    extraSheets,
  );
  if (laminationQty == null) return null;

  const total = roundMoney(perSheet * laminationQty);
  if (!Number.isFinite(total)) return null;

  return { perSheet, laminationQty, total };
}

export const laminationCostItem: CostItemModule = {
  id: "lamination",
  label: "Lamination",
  calculate(ctx): CostLineResult | null {
    const {
      quantity,
      config,
      paperType,
      printSides,
      artSheet,
      laminationEnabled,
    } = ctx;

    if (!laminationEnabled) return null;

    if (paperType === "morocco") {
      return {
        id: "lamination",
        label: "Lamination",
        perUnit: 0,
        total: 0,
        excluded: true,
        warning: "Lamination not applied to Morocco paper",
        meta: { status: "morocco_skip", paperType: "morocco" },
      };
    }

    if (!artSheet || artSheet.piecesPerSheet < 1) {
      return {
        id: "lamination",
        label: "Lamination",
        perUnit: 0,
        total: 0,
        excluded: true,
        warning: "N/A - no sheet fits",
        meta: { status: "no_sheet" },
      };
    }

    const result = calcLaminationCost(
      artSheet,
      quantity,
      printSides,
      config.artPaper.extraSheets,
      config.lamination,
    );
    if (!result) return null;

    const perUnit = roundMoney(result.total / quantity);
    if (!Number.isFinite(perUnit)) return null;

    return {
      id: "lamination",
      label: "Lamination",
      perUnit,
      total: result.total,
      meta: {
        status: "ok",
        sheetWidth: artSheet.width,
        sheetHeight: artSheet.height,
        perSheet: result.perSheet,
        laminationQty: result.laminationQty,
        printSides,
        divisor: config.lamination.divisor,
        rate: config.lamination.rate,
      },
    };
  },
};
