import type { ArtPaperConfig } from "../costConfig";
import { roundMoney } from "../currency";
import type { ArtSheetSelection, PrintSides } from "../types";

export interface ArtPaperCostResult {
  perSheetCostRaw: number;
  perSheetCostDisplay: number;
  perUnitSheetCost: number;
  sidesMultiplier: number;
  /** Pieces for one print side (quantity + fixed extra wastage) */
  piecesPerSide: number;
  /** Sheets used for costing (manual override or automatic) */
  piecesRequired: number;
  /** Automatic sheets required before any manual override */
  autoPiecesRequired: number;
  usedManualSheetsRequired: boolean;
  physicalSheets: number;
  total: number;
  sheetWidth: number;
  sheetHeight: number;
  piecesPerSheet: number;
}

/** Full-precision per-sheet cost (before UI rounding). */
export function calcArtPerSheetCostRaw(
  sheetWidth: number,
  sheetHeight: number,
  config: ArtPaperConfig,
): number | null {
  const { gsm, factor, divisor, scale } = config;
  if (
    ![sheetWidth, sheetHeight, gsm, factor, divisor, scale].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }
  const raw =
    ((sheetWidth * sheetHeight * gsm * factor) / divisor) / scale;
  return Number.isFinite(raw) ? raw : null;
}

export function calcArtPerUnitSheetCost(
  perSheetCostRaw: number,
  piecesPerSheet: number,
  markup: number,
): number | null {
  if (
    !(perSheetCostRaw > 0) ||
    !(piecesPerSheet >= 1) ||
    !Number.isFinite(piecesPerSheet) ||
    !(markup > 0) ||
    !Number.isFinite(markup)
  ) {
    return null;
  }
  const raw = (perSheetCostRaw / piecesPerSheet) * markup;
  if (!Number.isFinite(raw)) return null;
  return roundMoney(raw);
}

export function sidesMultiplier(printSides: PrintSides): number {
  return printSides === "double" ? 2 : 1;
}

/**
 * Per print side: quantity + EXTRA_SHEETS (fixed interior/exterior wastage per side).
 * Single side: one side only.
 * Double side: front (qty + extra) + back (qty + extra) = 2 × (qty + extra).
 */
export function calcArtPiecesPerSide(
  quantity: number,
  extraSheets: number,
): number | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!Number.isFinite(extraSheets) || extraSheets < 0) return null;
  const perSide = quantity + extraSheets;
  return Number.isFinite(perSide) ? perSide : null;
}

export function calcArtPiecesRequired(
  quantity: number,
  printSides: PrintSides,
  extraSheets: number,
): number | null {
  const perSide = calcArtPiecesPerSide(quantity, extraSheets);
  if (perSide == null) return null;
  const mult = sidesMultiplier(printSides);
  const pieces = mult * perSide;
  return Number.isFinite(pieces) ? pieces : null;
}

/** Parse manual total sheets required. Empty → null. */
export function parseArtSheetsRequired(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

export function calcArtPaperCost(
  artSheet: ArtSheetSelection,
  quantity: number,
  printSides: PrintSides,
  config: ArtPaperConfig,
  /** When set, replaces auto piecesRequired (total sheets required). */
  sheetsRequiredManual: number | null = null,
): ArtPaperCostResult | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  if (!(artSheet.piecesPerSheet >= 1)) return null;

  const perSheetCostRaw = calcArtPerSheetCostRaw(
    artSheet.width,
    artSheet.height,
    config,
  );
  if (perSheetCostRaw == null) return null;

  const perUnitSheetCost = calcArtPerUnitSheetCost(
    perSheetCostRaw,
    artSheet.piecesPerSheet,
    config.markup,
  );
  if (perUnitSheetCost == null) return null;

  const piecesPerSide = calcArtPiecesPerSide(quantity, config.extraSheets);
  const autoPiecesRequired = calcArtPiecesRequired(
    quantity,
    printSides,
    config.extraSheets,
  );
  if (piecesPerSide == null || autoPiecesRequired == null) return null;

  const usedManualSheetsRequired =
    sheetsRequiredManual != null &&
    Number.isInteger(sheetsRequiredManual) &&
    sheetsRequiredManual >= 1;
  const piecesRequired = usedManualSheetsRequired
    ? sheetsRequiredManual!
    : autoPiecesRequired;

  const total = roundMoney(perUnitSheetCost * piecesRequired);
  if (!Number.isFinite(total)) return null;

  const physicalSheets = Math.ceil(
    piecesRequired / artSheet.piecesPerSheet,
  );

  return {
    perSheetCostRaw,
    perSheetCostDisplay: roundMoney(perSheetCostRaw),
    perUnitSheetCost,
    sidesMultiplier: sidesMultiplier(printSides),
    piecesPerSide,
    piecesRequired,
    autoPiecesRequired,
    usedManualSheetsRequired,
    physicalSheets,
    total,
    sheetWidth: artSheet.width,
    sheetHeight: artSheet.height,
    piecesPerSheet: artSheet.piecesPerSheet,
  };
}
