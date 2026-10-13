import type { CostLineResult, CostItemModule } from "../types";
import { calcArtPaperCost } from "./artPaperCost";
import { calcMoroccoCost, isMoroccoError } from "./moroccoPaperCost";

function paddedSize(
  openWidthIn: number,
  openHeightIn: number,
  padW: number,
  padH: number,
): { widthIn: number; heightIn: number } {
  return {
    widthIn: openWidthIn + padW,
    heightIn: openHeightIn + padH,
  };
}

export const paperCostItem: CostItemModule = {
  id: "paper",
  label: "Paper",
  calculate(ctx): CostLineResult | null {
    const {
      openSizeIn,
      quantity,
      config,
      paperType,
      printSides,
      artSheet,
      artPaddingWIn,
      artPaddingHIn,
      artSheetsRequiredManual,
    } = ctx;

    if (!Number.isInteger(quantity) || quantity < 1) return null;

    const piece = paddedSize(
      openSizeIn.openWidthIn,
      openSizeIn.openHeightIn,
      artPaddingWIn,
      artPaddingHIn,
    );

    if (paperType === "morocco") {
      const result = calcMoroccoCost(
        piece.widthIn,
        piece.heightIn,
        quantity,
        config.morocco,
      );
      if (isMoroccoError(result)) {
        return {
          id: "paper",
          label: "Paper (Morocco)",
          perUnit: 0,
          total: 0,
          excluded: true,
          warning: result.error,
          meta: {
            paperType: "morocco",
            status: "error",
            artWidthIn: piece.widthIn,
            artHeightIn: piece.heightIn,
          },
        };
      }

      return {
        id: "paper",
        label: "Paper (Morocco)",
        perUnit: result.perUnit,
        total: result.total,
        meta: {
          paperType: "morocco",
          status: "ok",
          artWidthIn: piece.widthIn,
          artHeightIn: piece.heightIn,
          orientation: result.orientation.label,
          piecesAcross: result.orientation.piecesAcross,
          rollLengthPerPiece: result.orientation.rollLengthPerPiece,
          totalRollLengthIn: result.totalRollLengthIn,
          totalRollLengthYards: result.totalRollLengthYards,
          billableQuantity: result.billableQuantity,
          extraPieces: config.morocco.extraPieces,
        },
      };
    }

    // Art Paper
    if (!artSheet || artSheet.piecesPerSheet < 1) {
      return {
        id: "paper",
        label: "Paper (Art Paper)",
        perUnit: 0,
        total: 0,
        excluded: true,
        warning: "N/A - no sheet fits",
        meta: {
          paperType: "art",
          status: "no_sheet",
          artWidthIn: piece.widthIn,
          artHeightIn: piece.heightIn,
          printSides,
        },
      };
    }

    const art = calcArtPaperCost(
      artSheet,
      quantity,
      printSides,
      config.artPaper,
      artSheetsRequiredManual,
    );
    if (!art) return null;

    return {
      id: "paper",
      label: "Paper (Art Paper)",
      perUnit: art.perUnitSheetCost,
      total: art.total,
      meta: {
        paperType: "art",
        status: "ok",
        artWidthIn: piece.widthIn,
        artHeightIn: piece.heightIn,
        sheetWidth: art.sheetWidth,
        sheetHeight: art.sheetHeight,
        piecesPerSheet: art.piecesPerSheet,
        perSheetCost: art.perSheetCostDisplay,
        sidesMultiplier: art.sidesMultiplier,
        printSides,
        piecesPerSide: art.piecesPerSide,
        piecesRequired: art.piecesRequired,
        autoSheetsRequired: art.autoPiecesRequired,
        sheetsRequiredManual: art.usedManualSheetsRequired,
        physicalSheets: art.physicalSheets,
        extraSheets: config.artPaper.extraSheets,
        gsm: config.artPaper.gsm,
      },
    };
  },
};
