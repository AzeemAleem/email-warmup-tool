/**
 * Sheet nesting for mailer box open sizes (all lengths in inches).
 * Evaluates pure grids + mixed guillotine strip packing with rotation.
 */

import {
  ALL_SHEETS,
  BATCH_OUT,
  BATCH_STANDARD,
  sheetKey,
  type SheetBatch,
  type SheetSize,
} from "./sheetSizes";

const EPS = 1e-9;

export interface NestingPiece {
  widthIn: number;
  heightIn: number;
}

export interface PlacedRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** true when piece is printed as height×width relative to nesting size */
  rotated: boolean;
}

export interface SheetNestResult {
  sheet: SheetSize;
  pieces: number;
  layout: string;
  usedArea: number;
  sheetArea: number;
  wastagePercent: number;
  fits: boolean;
  placements: PlacedRect[];
}

export interface SheetRecommendation {
  recommended: SheetNestResult | null;
  /** True when we fell back to OUT because no STANDARD fits */
  usedOutFallback: boolean;
  /** True when nothing fits */
  noneFit: boolean;
  highestPieceCount: SheetNestResult | null;
  standardResults: SheetNestResult[];
  outResults: SheetNestResult[];
  allResults: SheetNestResult[];
}

export type NestSortMode = "wastage" | "pieces";

function floorDiv(numerator: number, denominator: number): number {
  if (!(denominator > 0) || !(numerator > 0)) return 0;
  return Math.floor((numerator + EPS) / denominator);
}

function safeWastage(sheetArea: number, usedArea: number): number {
  if (!(sheetArea > 0) || !Number.isFinite(sheetArea) || !Number.isFinite(usedArea)) {
    return 100;
  }
  const pct = ((sheetArea - usedArea) / sheetArea) * 100;
  if (!Number.isFinite(pct)) return 100;
  return Math.round(pct * 10) / 10;
}

function describeLayout(placements: PlacedRect[]): string {
  if (placements.length === 0) return "Does not fit";
  const unrot = placements.filter((p) => !p.rotated).length;
  const rot = placements.filter((p) => p.rotated).length;
  const parts: string[] = [];
  if (unrot > 0) parts.push(`${unrot} unrotated`);
  if (rot > 0) parts.push(`${rot} rotated`);
  return parts.join(" + ");
}

/** Pure axis-aligned grid for one fixed orientation. */
function pureGrid(
  sheetW: number,
  sheetH: number,
  pieceW: number,
  pieceH: number,
  rotated: boolean,
): { count: number; placements: PlacedRect[] } {
  const cols = floorDiv(sheetW, pieceW);
  const rows = floorDiv(sheetH, pieceH);
  const count = cols * rows;
  if (count === 0) return { count: 0, placements: [] };
  const placements: PlacedRect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      placements.push({
        x: c * pieceW,
        y: r * pieceH,
        w: pieceW,
        h: pieceH,
        rotated,
      });
    }
  }
  return { count, placements };
}

interface PackCandidate {
  count: number;
  placements: PlacedRect[];
}

/**
 * Recursive strip packing: place a full strip of one orientation, then
 * recurse on the remaining rectangle (allows mixed orientations).
 */
function recursiveStripPack(
  sheetW: number,
  sheetH: number,
  pieceW: number,
  pieceH: number,
): PackCandidate {
  const memo = new Map<string, PackCandidate>();

  function key(w: number, h: number): string {
    return `${(w + EPS).toFixed(6)}x${(h + EPS).toFixed(6)}`;
  }

  function pack(rw: number, rh: number): PackCandidate {
    if (!(rw > EPS) || !(rh > EPS)) return { count: 0, placements: [] };
    const k = key(rw, rh);
    const cached = memo.get(k);
    if (cached) return cached;

    let best: PackCandidate = { count: 0, placements: [] };

    const orients: { ow: number; oh: number; rotated: boolean }[] = [
      { ow: pieceW, oh: pieceH, rotated: false },
      { ow: pieceH, oh: pieceW, rotated: true },
    ];

    for (const { ow, oh, rotated } of orients) {
      if (ow > rw + EPS || oh > rh + EPS) continue;

      // Horizontal strip of height `oh`
      const across = floorDiv(rw, ow);
      if (across >= 1) {
        const strip: PlacedRect[] = [];
        for (let i = 0; i < across; i++) {
          strip.push({ x: i * ow, y: 0, w: ow, h: oh, rotated });
        }
        const rest = pack(rw, rh - oh);
        const shifted = rest.placements.map((p) => ({
          ...p,
          y: p.y + oh,
        }));
        const combined = { count: across + rest.count, placements: [...strip, ...shifted] };
        if (combined.count > best.count) best = combined;
      }

      // Vertical strip of width `ow`
      const down = floorDiv(rh, oh);
      if (down >= 1) {
        const strip: PlacedRect[] = [];
        for (let i = 0; i < down; i++) {
          strip.push({ x: 0, y: i * oh, w: ow, h: oh, rotated });
        }
        const rest = pack(rw - ow, rh);
        const shifted = rest.placements.map((p) => ({
          ...p,
          x: p.x + ow,
        }));
        const combined = { count: down + rest.count, placements: [...strip, ...shifted] };
        if (combined.count > best.count) best = combined;
      }
    }

    memo.set(k, best);
    return best;
  }

  return pack(sheetW, sheetH);
}

/**
 * Best nesting of a piece (with rotation) onto one sheet.
 * Considers pure grids and mixed strip packing; returns max piece count.
 */
export function nestPieceOnSheet(
  sheet: SheetSize,
  piece: NestingPiece,
): SheetNestResult {
  const sheetW = sheet.width;
  const sheetH = sheet.height;
  const pieceW = piece.widthIn;
  const pieceH = piece.heightIn;
  const sheetArea = sheetW * sheetH;
  const pieceArea = pieceW * pieceH;

  if (
    ![sheetW, sheetH, pieceW, pieceH].every((n) => Number.isFinite(n) && n > 0)
  ) {
    return emptyResult(sheet, sheetArea);
  }

  const candidates: PackCandidate[] = [
    pureGrid(sheetW, sheetH, pieceW, pieceH, false),
    pureGrid(sheetW, sheetH, pieceH, pieceW, true),
    recursiveStripPack(sheetW, sheetH, pieceW, pieceH),
  ];

  let best = candidates[0];
  for (const c of candidates) {
    if (c.count > best.count) best = c;
  }

  const pieces = best.count;
  const usedArea = pieces * pieceArea;
  const wastagePercent = pieces === 0 ? 100 : safeWastage(sheetArea, usedArea);

  return {
    sheet,
    pieces,
    layout: describeLayout(best.placements),
    usedArea: Number.isFinite(usedArea) ? usedArea : 0,
    sheetArea,
    wastagePercent,
    fits: pieces >= 1,
    placements: best.placements,
  };
}

function emptyResult(sheet: SheetSize, sheetArea: number): SheetNestResult {
  return {
    sheet,
    pieces: 0,
    layout: "Does not fit",
    usedArea: 0,
    sheetArea,
    wastagePercent: 100,
    fits: false,
    placements: [],
  };
}

function compareBest(a: SheetNestResult, b: SheetNestResult): number {
  // Lower wastage first, then more pieces, then smaller sheet area
  if (a.wastagePercent !== b.wastagePercent) {
    return a.wastagePercent - b.wastagePercent;
  }
  if (a.pieces !== b.pieces) return b.pieces - a.pieces;
  return a.sheetArea - b.sheetArea;
}

export function sortNestResults(
  results: SheetNestResult[],
  mode: NestSortMode = "wastage",
): SheetNestResult[] {
  const fitting = results.filter((r) => r.fits);
  const failing = results.filter((r) => !r.fits);
  fitting.sort((a, b) => {
    if (mode === "pieces") {
      if (a.pieces !== b.pieces) return b.pieces - a.pieces;
      return compareBest(a, b);
    }
    return compareBest(a, b);
  });
  return [...fitting, ...failing];
}

function pickHighestPieceCount(
  fitting: SheetNestResult[],
): SheetNestResult | null {
  if (fitting.length === 0) return null;
  return [...fitting].sort((a, b) => {
    if (a.pieces !== b.pieces) return b.pieces - a.pieces;
    return compareBest(a, b);
  })[0];
}

/**
 * Flat-list recommendation (no STANDARD/OUT preference).
 * Ties: lowest wastage %, then MORE pieces, then smaller sheet area.
 */
export function recommendBestSheet(
  piece: NestingPiece,
  sheets: readonly SheetSize[],
): Pick<
  SheetRecommendation,
  "recommended" | "noneFit" | "highestPieceCount" | "allResults"
> {
  const allResults = sortNestResults(
    sheets.map((s) => nestPieceOnSheet(s, piece)),
  );
  const fitting = allResults.filter((r) => r.fits);
  if (fitting.length === 0) {
    return {
      recommended: null,
      noneFit: true,
      highestPieceCount: null,
      allResults,
    };
  }
  const recommended = [...fitting].sort(compareBest)[0];
  return {
    recommended,
    noneFit: false,
    highestPieceCount: pickHighestPieceCount(fitting),
    allResults,
  };
}

/**
 * Evaluate all sheets and pick the recommended one (STANDARD preferred).
 */
export function recommendSheet(
  piece: NestingPiece,
  sheets: readonly SheetSize[] = ALL_SHEETS,
): SheetRecommendation {
  const allResults = sheets.map((s) => nestPieceOnSheet(s, piece));
  const standardResults = sortNestResults(
    allResults.filter((r) => r.sheet.batch === "STANDARD"),
  );
  const outResults = sortNestResults(
    allResults.filter((r) => r.sheet.batch === "OUT"),
  );

  const standardFits = standardResults.filter((r) => r.fits);
  const outFits = outResults.filter((r) => r.fits);

  let recommended: SheetNestResult | null = null;
  let usedOutFallback = false;
  let noneFit = false;

  if (standardFits.length > 0) {
    recommended = [...standardFits].sort(compareBest)[0];
  } else if (outFits.length > 0) {
    recommended = [...outFits].sort(compareBest)[0];
    usedOutFallback = true;
  } else {
    noneFit = true;
  }

  const allFitting = allResults.filter((r) => r.fits);

  return {
    recommended,
    usedOutFallback,
    noneFit,
    highestPieceCount: pickHighestPieceCount(allFitting),
    standardResults,
    outResults,
    allResults: sortNestResults(allResults),
  };
}

/** Convenience: STANDARD list only / OUT list only evaluators */
export function evaluateBatch(
  piece: NestingPiece,
  batch: SheetBatch,
): SheetNestResult[] {
  const list = batch === "STANDARD" ? BATCH_STANDARD : BATCH_OUT;
  return sortNestResults(list.map((s) => nestPieceOnSheet(s, piece)));
}
