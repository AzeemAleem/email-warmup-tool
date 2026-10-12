import type { MoroccoPaperConfig } from "../costConfig";
import { roundMoney } from "../currency";

export interface MoroccoOrientation {
  label: "A" | "B";
  piecesAcross: number;
  rowLengthIn: number;
  rollLengthPerPiece: number;
  pieceW: number;
  pieceH: number;
}

export interface MoroccoCostResult {
  orientation: MoroccoOrientation;
  pricePerInch: number;
  perUnit: number;
  billableQuantity: number;
  totalRollLengthIn: number;
  totalRollLengthYards: number;
  total: number;
  pieceWidthIn: number;
  pieceHeightIn: number;
}

function floorAcross(rollWidth: number, pieceDim: number): number {
  if (!(rollWidth > 0) || !(pieceDim > 0)) return 0;
  return Math.floor((rollWidth + 1e-9) / pieceDim);
}

/**
 * Try both orientations across the roll width; pick smaller rollLengthPerPiece.
 */
export function calcMoroccoNesting(
  pieceWidthIn: number,
  pieceHeightIn: number,
  rollWidthIn: number,
): MoroccoOrientation | null {
  if (
    ![pieceWidthIn, pieceHeightIn, rollWidthIn].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return null;
  }

  const candidates: MoroccoOrientation[] = [];

  const acrossA = floorAcross(rollWidthIn, pieceWidthIn);
  if (acrossA >= 1) {
    candidates.push({
      label: "A",
      piecesAcross: acrossA,
      rowLengthIn: pieceHeightIn,
      rollLengthPerPiece: pieceHeightIn / acrossA,
      pieceW: pieceWidthIn,
      pieceH: pieceHeightIn,
    });
  }

  const acrossB = floorAcross(rollWidthIn, pieceHeightIn);
  if (acrossB >= 1) {
    candidates.push({
      label: "B",
      piecesAcross: acrossB,
      rowLengthIn: pieceWidthIn,
      rollLengthPerPiece: pieceWidthIn / acrossB,
      pieceW: pieceHeightIn,
      pieceH: pieceWidthIn,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.rollLengthPerPiece - b.rollLengthPerPiece);
  return candidates[0];
}

export function calcMoroccoCost(
  pieceWidthIn: number,
  pieceHeightIn: number,
  quantity: number,
  config: MoroccoPaperConfig,
): MoroccoCostResult | { error: string } {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Invalid quantity" };
  }
  const {
    rollWidthIn,
    yardLengthIn,
    pricePerYard,
    markup,
    extraPieces,
  } = config;
  if (
    ![rollWidthIn, yardLengthIn, pricePerYard, markup].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  ) {
    return { error: "Invalid Morocco config" };
  }
  if (!Number.isFinite(extraPieces) || extraPieces < 0) {
    return { error: "Invalid Morocco config" };
  }

  const orientation = calcMoroccoNesting(
    pieceWidthIn,
    pieceHeightIn,
    rollWidthIn,
  );
  if (!orientation) {
    return { error: "Piece is wider than the roll." };
  }

  const pricePerInch = pricePerYard / yardLengthIn;
  const perUnitRaw =
    orientation.rollLengthPerPiece * pricePerInch * markup;
  if (!Number.isFinite(perUnitRaw)) {
    return { error: "Invalid Morocco cost" };
  }
  const perUnit = roundMoney(perUnitRaw);
  const billableQuantity = quantity + extraPieces;
  const total = roundMoney(perUnit * billableQuantity);
  if (!Number.isFinite(total)) {
    return { error: "Invalid Morocco cost" };
  }

  const totalRollLengthIn = quantity * orientation.rollLengthPerPiece;
  const totalRollLengthYards = totalRollLengthIn / yardLengthIn;

  return {
    orientation,
    pricePerInch,
    perUnit,
    billableQuantity,
    totalRollLengthIn,
    totalRollLengthYards,
    total,
    pieceWidthIn,
    pieceHeightIn,
  };
}

export function isMoroccoError(
  r: MoroccoCostResult | { error: string },
): r is { error: string } {
  return "error" in r;
}
