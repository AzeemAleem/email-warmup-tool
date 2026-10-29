import { pkrToUsd, roundMoney } from "@/lib/cost/currency";
import type { CostEngineResult, CostLineResult } from "@/lib/cost/types";

/** Full line item as stored under a project calculation */
export interface SnapshotCostItem {
  id: string;
  label: string;
  perUnit: number;
  total: number;
  excluded?: boolean;
  warning?: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface CalculationMoneyBlock {
  /** Base / production totals (before profit) */
  basePkr: number;
  baseUsd: number | null;
  sellingPkr: number;
  sellingUsd: number | null;
  perUnitBasePkr: number;
  perUnitBaseUsd: number | null;
  perUnitSellingPkr: number;
  perUnitSellingUsd: number | null;
  productionPkr: number;
  productionUsd: number | null;
  shippingPkr: number;
  shippingUsd: number | null;
}

/**
 * Builds the money / totals block that mirrors Live totals on the calculators.
 */
export function buildCalculationMoney(
  result: CostEngineResult,
  quantity: number,
  profitRatio: number | null | undefined,
  usdRate: number,
): CalculationMoneyBlock {
  const ratio =
    profitRatio != null && Number.isFinite(profitRatio) && profitRatio > 0
      ? profitRatio
      : 1;

  const shippingItem = result.items.find(
    (i) => i.id === "shipping" && !i.excluded,
  );
  const shippingPkr = shippingItem?.total ?? 0;
  const productionPkr = roundMoney(result.grandTotal - shippingPkr);
  const basePkr = result.grandTotal;
  const sellingPkr = roundMoney(basePkr * ratio);
  const qty = quantity >= 1 ? quantity : 1;

  const baseUsd = pkrToUsd(basePkr, usdRate);
  const sellingUsd = pkrToUsd(sellingPkr, usdRate);
  const productionUsd = pkrToUsd(productionPkr, usdRate);
  const shippingUsd = pkrToUsd(shippingPkr, usdRate);
  const perUnitBasePkr = result.costPerUnit;
  const perUnitSellingPkr = roundMoney(sellingPkr / qty);
  const perUnitBaseUsd =
    baseUsd != null ? roundMoney(baseUsd / qty) : null;
  const perUnitSellingUsd =
    sellingUsd != null ? roundMoney(sellingUsd / qty) : null;

  return {
    basePkr,
    baseUsd,
    sellingPkr,
    sellingUsd,
    perUnitBasePkr,
    perUnitBaseUsd,
    perUnitSellingPkr,
    perUnitSellingUsd,
    productionPkr,
    productionUsd,
    shippingPkr,
    shippingUsd,
  };
}

export function serializeCostItems(
  items: CostLineResult[],
): SnapshotCostItem[] {
  return items.map((i) => ({
    id: i.id,
    label: i.label,
    perUnit: i.perUnit,
    total: i.total,
    excluded: i.excluded,
    warning: i.warning,
    meta: i.meta ? { ...i.meta } : undefined,
  }));
}

/**
 * Shared fields every calculator snapshot should include for project history.
 */
export function buildCalculationCore(
  result: CostEngineResult,
  opts: {
    quantity: number;
    profitRatio: number | null | undefined;
    usdRate: number;
  },
) {
  const money = buildCalculationMoney(
    result,
    opts.quantity,
    opts.profitRatio,
    opts.usdRate,
  );

  return {
    quantity: opts.quantity,
    profitRatio:
      opts.profitRatio != null && opts.profitRatio > 0
        ? opts.profitRatio
        : 1,
    usdRate: opts.usdRate,
    // Legacy aliases (kept for older saved rows)
    grandTotal: money.basePkr,
    costPerUnit: money.perUnitBasePkr,
    // Full money block
    ...money,
    items: serializeCostItems(result.items),
    warnings: result.warnings ?? [],
  };
}
