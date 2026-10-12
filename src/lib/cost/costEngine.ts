import {
  DEFAULT_ART_PADDING_H_IN,
  DEFAULT_ART_PADDING_W_IN,
} from "../rigidSheetSizes";
import { DEFAULT_COST_CONFIG, type CostConfig } from "./costConfig";
import { roundMoney } from "./currency";
import { debossCostItem } from "./items/debossCost";
import { dieCostItem } from "./items/dieCost";
import { embossingCostItem } from "./items/embossingCost";
import { foilingCostItem } from "./items/foilingCost";
import { greyboardCostItem } from "./items/greyboardCost";
import { laborCostItem } from "./items/laborCost";
import { laminationCostItem } from "./items/laminationCost";
import { paperCostItem } from "./items/paperCost";
import { platesCostItem } from "./items/platesCost";
import { printingCostItem } from "./items/printingCost";
import { extraCostItem } from "./items/extraCost";
import { shippingCostItem } from "./items/shippingCost";
import { spotUvCostItem } from "./items/spotUvCost";
import type {
  ArtSheetSelection,
  CostContext,
  CostEngineResult,
  CostItemModule,
  CostLineResult,
  OpenSizeIn,
  PaperType,
  PrintColorMode,
  PrintSides,
} from "./types";

/**
 * Registered cost items. Add a new cost later by importing the module
 * and appending it here — no UI rewrite needed.
 */
const COST_ITEMS: readonly CostItemModule[] = [
  greyboardCostItem,
  paperCostItem,
  laminationCostItem,
  spotUvCostItem,
  dieCostItem,
  printingCostItem,
  platesCostItem,
  foilingCostItem,
  laborCostItem,
  debossCostItem,
  embossingCostItem,
  shippingCostItem,
  extraCostItem,
];

export interface CostEngineExtras {
  paperType?: PaperType;
  printSides?: PrintSides;
  artSheet?: ArtSheetSelection | null;
  artPaddingWIn?: number;
  artPaddingHIn?: number;
  laminationEnabled?: boolean;
  spotUvEnabled?: boolean;
  spotUvManualTotal?: number | null;
  dieEnabled?: boolean;
  dieManualTotal?: number | null;
  printColorMode?: PrintColorMode;
  printingEnabled?: boolean;
  printingManualTotal?: number | null;
  platesEnabled?: boolean;
  platesManualTotal?: number | null;
  foilingEnabled?: boolean;
  foilingManualTotal?: number | null;
  laborEnabled?: boolean;
  laborManualTotal?: number | null;
  debossEnabled?: boolean;
  debossManualTotal?: number | null;
  embossingEnabled?: boolean;
  embossingManualTotal?: number | null;
  /** Optional extra expenses (PKR); null/0 = omit */
  extraTotal?: number | null;
}

/** Parse quantity: whole number ≥ 1 only. Returns null if invalid. */
export function parseQuantity(raw: string): number | null {
  if (raw.trim() === "") return null;
  if (!/^\d+$/.test(raw.trim())) return null; // reject decimals / signs / junk
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || !Number.isFinite(n)) return null;
  return n;
}

export function quantityError(raw: string, touched: boolean): string | null {
  if (!touched && raw.trim() === "") return null;
  if (raw.trim() === "") return "Required";
  if (raw.includes(".") || raw.includes(",")) return "Whole numbers only";
  if (!/^\d+$/.test(raw.trim())) return "Must be a whole number";
  const n = Number(raw.trim());
  if (n === 0) return "Must be at least 1";
  if (n < 0) return "Must be positive";
  if (!Number.isFinite(n)) return "Invalid value";
  return null;
}

function buildContext(
  openSizeIn: OpenSizeIn,
  quantity: number,
  config: CostConfig,
  extras: CostEngineExtras = {},
): CostContext {
  return {
    openSizeIn,
    quantity,
    config,
    paperType: extras.paperType ?? "art",
    printSides: extras.printSides ?? "double",
    artSheet: extras.artSheet === undefined ? null : extras.artSheet,
    artPaddingWIn: extras.artPaddingWIn ?? DEFAULT_ART_PADDING_W_IN,
    artPaddingHIn: extras.artPaddingHIn ?? DEFAULT_ART_PADDING_H_IN,
    laminationEnabled: extras.laminationEnabled ?? false,
    spotUvEnabled: extras.spotUvEnabled ?? false,
    spotUvManualTotal:
      extras.spotUvManualTotal === undefined ? null : extras.spotUvManualTotal,
    dieEnabled: extras.dieEnabled ?? false,
    dieManualTotal:
      extras.dieManualTotal === undefined ? null : extras.dieManualTotal,
    printColorMode: extras.printColorMode ?? "cmyk",
    printingEnabled: extras.printingEnabled ?? false,
    printingManualTotal:
      extras.printingManualTotal === undefined
        ? null
        : extras.printingManualTotal,
    platesEnabled: extras.platesEnabled ?? false,
    platesManualTotal:
      extras.platesManualTotal === undefined ? null : extras.platesManualTotal,
    foilingEnabled: extras.foilingEnabled ?? false,
    foilingManualTotal:
      extras.foilingManualTotal === undefined ? null : extras.foilingManualTotal,
    laborEnabled: extras.laborEnabled ?? false,
    laborManualTotal:
      extras.laborManualTotal === undefined ? null : extras.laborManualTotal,
    debossEnabled: extras.debossEnabled ?? false,
    debossManualTotal:
      extras.debossManualTotal === undefined ? null : extras.debossManualTotal,
    embossingEnabled: extras.embossingEnabled ?? false,
    embossingManualTotal:
      extras.embossingManualTotal === undefined
        ? null
        : extras.embossingManualTotal,
    extraTotal: extras.extraTotal === undefined ? null : extras.extraTotal,
  };
}

/**
 * Run all registered cost items and return line items + grand total.
 * Returns null when open size or quantity is invalid.
 */
export function runCostEngine(
  openSizeIn: OpenSizeIn | null,
  quantity: number | null,
  config: CostConfig = DEFAULT_COST_CONFIG,
  extras: CostEngineExtras = {},
): CostEngineResult | null {
  if (
    openSizeIn == null ||
    quantity == null ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !Number.isFinite(openSizeIn.openWidthIn) ||
    !Number.isFinite(openSizeIn.openHeightIn) ||
    openSizeIn.openWidthIn <= 0 ||
    openSizeIn.openHeightIn <= 0
  ) {
    return null;
  }

  const ctx = buildContext(openSizeIn, quantity, config, extras);
  const items: CostLineResult[] = [];
  for (const item of COST_ITEMS) {
    const line = item.calculate(ctx);
    if (line) items.push(line);
  }

  if (items.length === 0) return null;

  const included = items.filter((line) => !line.excluded);
  const grandTotal = roundMoney(
    included.reduce((sum, line) => sum + line.total, 0),
  );
  if (!Number.isFinite(grandTotal)) return null;

  const costPerUnit = roundMoney(grandTotal / quantity);
  if (!Number.isFinite(costPerUnit)) return null;

  const warnings = items
    .map((line) => line.warning)
    .filter((w): w is string => typeof w === "string" && w.length > 0);

  return { items, grandTotal, costPerUnit, warnings };
}

/** Exposed for tests / future UI listing */
export function registeredCostItemIds(): string[] {
  return COST_ITEMS.map((i) => i.id);
}
