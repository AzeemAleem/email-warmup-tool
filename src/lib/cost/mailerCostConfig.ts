/**
 * Cost configuration for mailer box calculator.
 */

export type MailerMaterialType = "cardboard" | "kraft";

export interface MailerStockConfig {
  /** Selected material type */
  materialType: MailerMaterialType;
  /** Cardboard rate (PKR) */
  cardboardRate: number;
  /** Kraft rate (PKR) */
  kraftRate: number;
  /** GSM for stock calculation (default 350) */
  gsm: number;
  /** Open size padding in inches (add to both dimensions) */
  paddingIn: number;
}

export interface MailerLaminationConfig {
  /** Rate per calculation unit (default 4.5) */
  rate: number;
  /** Divisor for area calculation (default 144) */
  divisor: number;
  /** Default sides: 0, 1, or 2 */
  defaultSides: number;
}

export interface MailerCorrugationConfig {
  /** Corrugation rate per roll (PKR, default 150) */
  ratePerRoll: number;
  /** Roll capacity in pieces (default 2400) */
  rollCapacity: number;
  /** Pasting cost per sheet (PKR, default 10) */
  pastingPerSheet: number;
}

export interface MailerPastingConfig {
  /** Fixed pasting cost (PKR, default 5000) */
  fixedCost: number;
}

export interface MailerShippingConfig {
  /** GSM for weight calculation (default 450) */
  gsm: number;
  /** Rate per kg (PKR, default 3000) */
  ratePerKg: number;
}

export interface MailerCostConfig {
  stock: MailerStockConfig;
  lamination: MailerLaminationConfig;
  corrugation: MailerCorrugationConfig;
  pasting: MailerPastingConfig;
  plates: { costPerPlate: number; baseMaxQty: number; midMaxQty: number };
  printing: { costPerColor: number };
  die: { fixedCost: number };
  cutting: { fixedCost: number };
  shipping: MailerShippingConfig;
  fx: { usdRate: number };
}

export const DEFAULT_MAILER_COST_CONFIG: Readonly<MailerCostConfig> = {
  stock: {
    materialType: "cardboard",
    cardboardRate: 550,
    kraftRate: 450,
    gsm: 350,
    paddingIn: 2,
  },
  lamination: {
    rate: 4.5,
    divisor: 144,
    defaultSides: 1,
  },
  corrugation: {
    ratePerRoll: 150,
    rollCapacity: 2400,
    pastingPerSheet: 10,
  },
  pasting: {
    fixedCost: 5000,
  },
  plates: {
    costPerPlate: 2000,
    baseMaxQty: 1000,
    midMaxQty: 2500,
  },
  printing: {
    costPerColor: 3000,
  },
  die: {
    fixedCost: 5000,
  },
  cutting: {
    fixedCost: 5000,
  },
  shipping: {
    gsm: 450,
    ratePerKg: 3000,
  },
  fx: {
    usdRate: 275,
  },
};
