"use client";

import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import {
  formatPkr,
  formatPkrTotal,
  formatUsd,
  pkrToUsd,
  roundMoney,
} from "@/lib/cost/currency";
import type { CostEngineResult } from "@/lib/cost/types";

export function useCostTotals(
  result: CostEngineResult,
  quantity: number | null,
  profitRatio: number | null | undefined,
  usdRate: number,
) {
  const ratio =
    profitRatio != null && Number.isFinite(profitRatio) && profitRatio > 0
      ? profitRatio
      : 1;
  const withoutProfitPkr = result.grandTotal;
  const withProfitPkr = roundMoney(withoutProfitPkr * ratio);
  const withoutProfitUsd = pkrToUsd(withoutProfitPkr, usdRate);
  const withProfitUsd = pkrToUsd(withProfitPkr, usdRate);
  const qty = quantity != null && quantity >= 1 ? quantity : null;
  const perUnitWithoutPkr = result.costPerUnit;
  const perUnitWithPkr = roundMoney(withProfitPkr / (qty ?? 1));
  const perUnitWithoutUsd =
    withoutProfitUsd != null && qty != null
      ? roundMoney(withoutProfitUsd / qty)
      : null;
  const perUnitWithUsd =
    withProfitUsd != null && qty != null
      ? roundMoney(withProfitUsd / qty)
      : null;
  const itemCount = result.items.filter((i) => !i.excluded).length;

  return {
    ratio,
    withoutProfitPkr,
    withProfitPkr,
    withoutProfitUsd,
    withProfitUsd,
    perUnitWithoutPkr,
    perUnitWithPkr,
    perUnitWithoutUsd,
    perUnitWithUsd,
    itemCount,
    qty,
  };
}

/** Full totals card (used sticky on the right / inline at bottom). */
export function CostTotalsSummary({
  result,
  quantity,
  profitRatio,
  usdRate,
  compact = false,
  className,
}: {
  result: CostEngineResult;
  quantity: number | null;
  profitRatio?: number | null;
  usdRate: number;
  /** Slimmer sticky panel layout */
  compact?: boolean;
  className?: string;
}) {
  const t = useCostTotals(result, quantity, profitRatio, usdRate);

  return (
    <Card
      className={clsx(
        "border-pacify-gold/30 bg-pacify-forest/30",
        className,
      )}
    >
      <div className={clsx("flex flex-col", compact ? "gap-3" : "gap-4")}>
        <div>
          <p className="text-xs font-medium text-pacify-gold/80 uppercase tracking-wide">
            Total (PKR)
          </p>
          <p
            className={clsx(
              "mt-1 font-bold text-pacify-gold tabular-nums",
              compact ? "text-lg" : "text-2xl",
            )}
          >
            Base: {formatPkrTotal(t.withoutProfitPkr)}
          </p>
          <p
            className={clsx(
              "mt-1 font-bold text-white tabular-nums",
              compact ? "text-lg" : "text-2xl",
            )}
          >
            Selling (×{t.ratio}): {formatPkrTotal(t.withProfitPkr)}
          </p>
        </div>

        <div className={compact ? "space-y-1" : "sm:text-right space-y-0.5"}>
          <p className="text-xs text-gray-500">Per unit (PKR)</p>
          <p className="text-sm text-gray-300 tabular-nums">
            Base: {formatPkr(t.perUnitWithoutPkr)}
          </p>
          <p className="text-sm text-white tabular-nums">
            Selling: {formatPkr(t.perUnitWithPkr)}
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            {t.itemCount} cost item{t.itemCount !== 1 ? "s" : ""}
            {" · "}USD @{usdRate}
            {t.qty != null ? ` · qty ${t.qty.toLocaleString("en-US")}` : ""}
          </p>
        </div>

        <div
          className={clsx(
            "border-t border-pacify-gold/20 pt-3",
            compact ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 gap-4",
          )}
        >
          <div>
            <p className="text-xs font-medium text-pacify-silver uppercase tracking-wide mb-1">
              Final (USD)
            </p>
            <p className="text-sm font-semibold text-gray-300 tabular-nums">
              Base:{" "}
              {t.withoutProfitUsd != null
                ? formatUsd(t.withoutProfitUsd)
                : "—"}
            </p>
            <p className="text-sm font-semibold text-white tabular-nums mt-0.5">
              Selling:{" "}
              {t.withProfitUsd != null ? formatUsd(t.withProfitUsd) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-pacify-silver uppercase tracking-wide mb-1">
              Per unit (USD)
            </p>
            <p className="text-sm font-semibold text-gray-300 tabular-nums">
              Base:{" "}
              {t.perUnitWithoutUsd != null
                ? formatUsd(t.perUnitWithoutUsd)
                : "—"}
            </p>
            <p className="text-sm font-semibold text-white tabular-nums mt-0.5">
              Selling:{" "}
              {t.perUnitWithUsd != null ? formatUsd(t.perUnitWithUsd) : "—"}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Compact floating bar for mobile when the full sticky column is hidden. */
export function CostTotalsStickyBar({
  result,
  quantity,
  profitRatio,
  usdRate,
}: {
  result: CostEngineResult;
  quantity: number | null;
  profitRatio?: number | null;
  usdRate: number;
}) {
  const t = useCostTotals(result, quantity, profitRatio, usdRate);

  return (
    <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 border-t border-pacify-gold/30 bg-gray-950/95 backdrop-blur-md px-4 py-3">
      <div className="flex items-end justify-between gap-3 max-w-4xl mx-auto">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-pacify-gold/80">
            Selling (×{t.ratio})
          </p>
          <p className="text-base font-bold text-white tabular-nums truncate">
            {formatPkrTotal(t.withProfitPkr)}
          </p>
          <p className="text-xs text-gray-400 tabular-nums">
            Base {formatPkrTotal(t.withoutProfitPkr)}
            {t.withProfitUsd != null
              ? ` · ${formatUsd(t.withProfitUsd)}`
              : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-gray-500">/ unit sell</p>
          <p className="text-sm font-semibold text-white tabular-nums">
            {formatPkr(t.perUnitWithPkr)}
          </p>
        </div>
      </div>
    </div>
  );
}
