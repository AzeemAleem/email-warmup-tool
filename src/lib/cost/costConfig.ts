/**
 * Editable cost constants for rigid/mailer box cost engine.
 * Change defaults here; Advanced settings can override at runtime.
 */

export interface GreyboardConfig {
  gsm: number;
  factor: number;
  divisor: number;
  scale: number;
  markup: number;
}

export interface ArtPaperConfig {
  gsm: number;
  factor: number;
  divisor: number;
  scale: number;
  markup: number;
  /** Fixed extra pieces per print side (front/back wastage; default 200 each) */
  extraSheets: number;
}

export interface MoroccoPaperConfig {
  rollWidthIn: number;
  yardLengthIn: number;
  pricePerYard: number;
  markup: number;
  /** Extra pieces added to quantity (default 0) */
  extraPieces: number;
}

export interface LaminationConfig {
  divisor: number;
  rate: number;
}

/**
 * Spot UV tiered pricing:
 * - qty ≤ fixedMaxQty → fixedCost (lump sum)
 * - fixedMaxQty < qty ≤ midMaxQty → midRatePerUnit × qty
 * - qty > midMaxQty → highRatePerUnit × qty
 */
export interface SpotUvConfig {
  fixedCost: number;
  fixedMaxQty: number;
  midMaxQty: number;
  midRatePerUnit: number;
  highRatePerUnit: number;
}

export interface DieConfig {
  /** Fixed die making + die cutting total (PKR) */
  fixedCost: number;
}

export interface PrintingConfig {
  /** Cost per color, one side (default 3,000 PKR) */
  costPerColor: number;
}

/**
 * Printing plates:
 * base = colors × costPerPlate × sides
 * then × qtyMultiplier by quantity tier:
 * - qty ≤ baseMaxQty → 1×
 * - baseMaxQty < qty ≤ midMaxQty → 2×
 * - qty > midMaxQty → 3× (stays at 3× for all higher qty)
 */
export interface PlatesConfig {
  /** Cost per plate, one side (default 2,000 PKR) */
  costPerPlate: number;
  /** Qty at or below this uses 1× base (default 1,000) */
  baseMaxQty: number;
  /** Qty at or below this (above baseMaxQty) uses 2× base (default 2,500) */
  midMaxQty: number;
}

export interface FixedJobConfig {
  /** Fixed job total (PKR) */
  fixedCost: number;
}

/** Open-size weight (kg): (W × H × GSM / DIVISOR) / SCALE */
export interface WeightConfig {
  gsm: number;
  divisor: number;
  scale: number;
}

/** How shipping weight is measured */
export type ShippingWeightMode = "actual" | "volumetric";

export interface AirCartonConfig {
  id: string;
  label: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  /** Carton rating for billing (e.g. 25) — chargeable = cartons × labeledKg */
  labeledKg: number;
  /** Max fill capacity for packing (e.g. 25 kg carton → 22) */
  billedKg: number;
}

export interface ShippingConfig {
  /** PKR per kg (default 3,000) */
  ratePerKg: number;
  /** actual = open-size GSM formula; volumetric = (L×W×H cm) / divisor */
  weightMode: ShippingWeightMode;
  /** Volumetric divisor (default 5,000) — (L×W×H cm) / divisor = kg */
  volumetricDivisor: number;
  /** Air carton catalog — best option is chosen automatically */
  airCartons: AirCartonConfig[];
}

export interface FxConfig {
  /** PKR per 1 USD (default 275) */
  usdRate: number;
}

export interface CostConfig {
  greyboard: GreyboardConfig;
  artPaper: ArtPaperConfig;
  morocco: MoroccoPaperConfig;
  lamination: LaminationConfig;
  spotUv: SpotUvConfig;
  die: DieConfig;
  printing: PrintingConfig;
  plates: PlatesConfig;
  foiling: FixedJobConfig;
  deboss: FixedJobConfig;
  embossing: FixedJobConfig;
  weight: WeightConfig;
  shipping: ShippingConfig;
  fx: FxConfig;
}

export const DEFAULT_GREYBOARD_CONFIG: Readonly<GreyboardConfig> = {
  gsm: 1200,
  factor: 400,
  divisor: 15500,
  scale: 100,
  markup: 1.25,
};

export const DEFAULT_ART_PAPER_CONFIG: Readonly<ArtPaperConfig> = {
  gsm: 150,
  factor: 500,
  divisor: 3100,
  scale: 500,
  markup: 1.25,
  extraSheets: 200,
};

export const DEFAULT_MOROCCO_CONFIG: Readonly<MoroccoPaperConfig> = {
  rollWidthIn: 54,
  yardLengthIn: 36,
  pricePerYard: 400,
  markup: 1,
  extraPieces: 0,
};

export const DEFAULT_LAMINATION_CONFIG: Readonly<LaminationConfig> = {
  divisor: 144,
  rate: 5,
};

export const DEFAULT_SPOT_UV_CONFIG: Readonly<SpotUvConfig> = {
  fixedCost: 10000,
  fixedMaxQty: 200,
  midMaxQty: 500,
  midRatePerUnit: 50,
  highRatePerUnit: 25,
};

export const DEFAULT_DIE_CONFIG: Readonly<DieConfig> = {
  fixedCost: 5000,
};

export const DEFAULT_PRINTING_CONFIG: Readonly<PrintingConfig> = {
  costPerColor: 3000,
};

export const DEFAULT_PLATES_CONFIG: Readonly<PlatesConfig> = {
  costPerPlate: 2000,
  baseMaxQty: 1000,
  midMaxQty: 2500,
};

export const DEFAULT_FOILING_CONFIG: Readonly<FixedJobConfig> = {
  fixedCost: 10000,
};

export const DEFAULT_DEBOSS_CONFIG: Readonly<FixedJobConfig> = {
  fixedCost: 10000,
};

export const DEFAULT_EMBOSSING_CONFIG: Readonly<FixedJobConfig> = {
  fixedCost: 10000,
};

export const DEFAULT_WEIGHT_CONFIG: Readonly<WeightConfig> = {
  gsm: 1600,
  divisor: 15500,
  scale: 100,
};

export const DEFAULT_SHIPPING_CONFIG: Readonly<ShippingConfig> = {
  ratePerKg: 3000,
  weightMode: "actual",
  volumetricDivisor: 5000,
  airCartons: [
    { id: "25kg", label: "25 kg", lengthIn: 21, widthIn: 17, heightIn: 16, labeledKg: 25, billedKg: 22 },
    { id: "20kg", label: "20 kg", lengthIn: 18.9, widthIn: 15.7, heightIn: 15.4, labeledKg: 20, billedKg: 18 },
    { id: "15kg", label: "15 kg", lengthIn: 16.5, widthIn: 14.2, heightIn: 14.6, labeledKg: 15, billedKg: 13 },
    { id: "10kg", label: "10 kg", lengthIn: 13.4, widthIn: 12.6, heightIn: 13.8, labeledKg: 10, billedKg: 9 },
    { id: "5kg", label: "5 kg", lengthIn: 13.4, widthIn: 12.6, heightIn: 7.1, labeledKg: 5, billedKg: 4.5 },
    { id: "2_5kg", label: "2.5 kg", lengthIn: 13.4, widthIn: 12.6, heightIn: 3.5, labeledKg: 2.5, billedKg: 2.2 },
    { id: "1_5kg", label: "1.5 kg", lengthIn: 13.4, widthIn: 7.1, heightIn: 3.1, labeledKg: 1.5, billedKg: 1.3 },
  ],
};

export const DEFAULT_FX_CONFIG: Readonly<FxConfig> = {
  usdRate: 275,
};

export const DEFAULT_COST_CONFIG: Readonly<CostConfig> = {
  greyboard: { ...DEFAULT_GREYBOARD_CONFIG },
  artPaper: { ...DEFAULT_ART_PAPER_CONFIG },
  morocco: { ...DEFAULT_MOROCCO_CONFIG },
  lamination: { ...DEFAULT_LAMINATION_CONFIG },
  spotUv: { ...DEFAULT_SPOT_UV_CONFIG },
  die: { ...DEFAULT_DIE_CONFIG },
  printing: { ...DEFAULT_PRINTING_CONFIG },
  plates: { ...DEFAULT_PLATES_CONFIG },
  foiling: { ...DEFAULT_FOILING_CONFIG },
  deboss: { ...DEFAULT_DEBOSS_CONFIG },
  embossing: { ...DEFAULT_EMBOSSING_CONFIG },
  weight: { ...DEFAULT_WEIGHT_CONFIG },
  shipping: { ...DEFAULT_SHIPPING_CONFIG },
  fx: { ...DEFAULT_FX_CONFIG },
};
