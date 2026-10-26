import type { CostConfig } from "./costConfig";

export interface OpenSizeIn {
  openWidthIn: number;
  openHeightIn: number;
}

/** Closed box size in centimetres (for volumetric shipping weight) */
export interface ClosedBoxCm {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export type PaperType = "art" | "morocco";
export type PrintSides = "single" | "double";
/** 1-color job vs CMYK (4 colors) */
export type PrintColorMode = "one" | "cmyk";

/** Recommended art paper sheet used for Art Paper / Lamination cost */
export interface ArtSheetSelection {
  width: number;
  height: number;
  piecesPerSheet: number;
}

export interface CostContext {
  openSizeIn: OpenSizeIn;
  quantity: number;
  config: CostConfig;
  paperType: PaperType;
  printSides: PrintSides;
  /** null when no art sheet fits (Art Paper mode) */
  artSheet: ArtSheetSelection | null;
  /** Art paper / Morocco padded piece size padding (inches) */
  artPaddingWIn: number;
  artPaddingHIn: number;
  /** When false, lamination line is omitted */
  laminationEnabled: boolean;
  /** When false, Spot UV line is omitted */
  spotUvEnabled: boolean;
  /** Manual Spot UV total (PKR); null = use automatic when eligible */
  spotUvManualTotal: number | null;
  /** When false, die making + cutting line is omitted */
  dieEnabled: boolean;
  /** Manual die total (PKR); null = use fixed default */
  dieManualTotal: number | null;
  /** 1 color or CMYK (4) — drives printing + plates */
  printColorMode: PrintColorMode;
  printingEnabled: boolean;
  printingManualTotal: number | null;
  platesEnabled: boolean;
  platesManualTotal: number | null;
  foilingEnabled: boolean;
  foilingManualTotal: number | null;
  laborEnabled: boolean;
  laborManualTotal: number | null;
  debossEnabled: boolean;
  debossManualTotal: number | null;
  embossingEnabled: boolean;
  embossingManualTotal: number | null;
  /** Optional lump-sum extra expenses (PKR); null/0 = omitted */
  extraTotal: number | null;
  /**
   * Manual override for Art Paper total sheets required.
   * null = use automatic (sides × (qty + extra)).
   */
  artSheetsRequiredManual: number | null;
  /** Closed box L×W×H in cm — required for volumetric shipping weight */
  closedBoxCm: ClosedBoxCm | null;
}

export interface CostLineResult {
  id: string;
  label: string;
  /** Rounded to 2 decimals */
  perUnit: number;
  /** Line total (already rounded) */
  total: number;
  /** Extra display fields for the UI (GSM, open size, etc.) */
  meta?: Record<string, string | number | boolean | null>;
  /**
   * When true, show the row (e.g. "N/A") but exclude from grand total.
   */
  excluded?: boolean;
  warning?: string;
}

export interface CostItemModule {
  id: string;
  label: string;
  calculate: (ctx: CostContext) => CostLineResult | null;
}

export interface CostEngineResult {
  items: CostLineResult[];
  /** Sum of included (non-excluded) item totals */
  grandTotal: number;
  /** grandTotal / quantity (rounded to 2 decimals) */
  costPerUnit: number;
  warnings: string[];
}
