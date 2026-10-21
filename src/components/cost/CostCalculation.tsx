"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import {
  DEFAULT_ART_PAPER_CONFIG,
  DEFAULT_COST_CONFIG,
  DEFAULT_DEBOSS_CONFIG,
  DEFAULT_DIE_CONFIG,
  DEFAULT_EMBOSSING_CONFIG,
  DEFAULT_FOILING_CONFIG,
  DEFAULT_FX_CONFIG,
  DEFAULT_GREYBOARD_CONFIG,
  DEFAULT_LAMINATION_CONFIG,
  DEFAULT_MOROCCO_CONFIG,
  DEFAULT_PLATES_CONFIG,
  DEFAULT_PRINTING_CONFIG,
  DEFAULT_SHIPPING_CONFIG,
  DEFAULT_SPOT_UV_CONFIG,
  DEFAULT_WEIGHT_CONFIG,
  type ArtPaperConfig,
  type CostConfig,
  type DieConfig,
  type FixedJobConfig,
  type FxConfig,
  type GreyboardConfig,
  type LaminationConfig,
  type MoroccoPaperConfig,
  type PlatesConfig,
  type PrintingConfig,
  type ShippingConfig,
  type ShippingWeightMode,
  type SpotUvConfig,
  type WeightConfig,
} from "@/lib/cost/costConfig";
import {
  formatPkr,
  formatPkrTotal,
  roundMoney,
} from "@/lib/cost/currency";
import type { CostEngineResult, CostLineResult } from "@/lib/cost/types";
import { formatLength } from "@/lib/lengthUnits";
import { CostTotalsSummary } from "@/components/cost/CostTotalsSummary";

interface OverrideControls {
  enabled?: boolean;
  override?: boolean;
  manualRaw?: string;
  onOverrideChange?: (v: boolean) => void;
  onManualRawChange?: (v: string) => void;
}

interface Props {
  result: CostEngineResult | null;
  quantity: number | null;
  config: CostConfig;
  onConfigChange: (config: CostConfig) => void;
  /** Spot UV: show override / manual input controls */
  spotUvEnabled?: boolean;
  spotUvOverride?: boolean;
  spotUvManualRaw?: string;
  onSpotUvOverrideChange?: (v: boolean) => void;
  onSpotUvManualRawChange?: (v: string) => void;
  /** Die making + cutting */
  dieEnabled?: boolean;
  dieOverride?: boolean;
  dieManualRaw?: string;
  onDieOverrideChange?: (v: boolean) => void;
  onDieManualRawChange?: (v: string) => void;
  /** Printing */
  printingEnabled?: boolean;
  printingOverride?: boolean;
  printingManualRaw?: string;
  onPrintingOverrideChange?: (v: boolean) => void;
  onPrintingManualRawChange?: (v: string) => void;
  /** Plates */
  platesEnabled?: boolean;
  platesOverride?: boolean;
  platesManualRaw?: string;
  onPlatesOverrideChange?: (v: boolean) => void;
  onPlatesManualRawChange?: (v: string) => void;
  foiling?: OverrideControls;
  labor?: OverrideControls;
  deboss?: OverrideControls;
  embossing?: OverrideControls;
  /** Profit multiplier, e.g. 1.5 = +50%. Invalid/empty → treat as 1. */
  profitRatio?: number | null;
  clientName?: string;
  onDownloadPdf?: () => void;
  /** Art paper: editable total sheets required */
  artSheetsOverride?: boolean;
  artSheetsManualRaw?: string;
  onArtSheetsOverrideChange?: (v: boolean) => void;
  onArtSheetsManualRawChange?: (v: string) => void;
  /** Fitting sheet choices for manual sheet selection */
  artSheetOptions?: {
    key: string;
    width: number;
    height: number;
    piecesPerSheet: number;
    wastagePercent: number;
    isRecommended: boolean;
  }[];
  /** null = auto recommended */
  artSheetKeyOverride?: string | null;
  onArtSheetKeyChange?: (key: string | null) => void;
  /** Hide inline totals when shown in an external sticky panel */
  hideTotals?: boolean;
}

const inputCls =
  "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30";

function numField(
  value: number,
  onChange: (n: number) => void,
  step: string,
) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n) || n < 0) return;
        onChange(n);
      }}
      className={inputCls}
    />
  );
}

function EstimateBadge() {
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 cursor-help"
      title="Estimated/base price. Final price depends on block size, design area, quantity and job requirements."
    >
      Estimate
    </span>
  );
}

function PaperCard({
  item,
  quantity,
  artSheetsOverride,
  artSheetsManualRaw,
  onArtSheetsOverrideChange,
  onArtSheetsManualRawChange,
  artSheetOptions,
  artSheetKeyOverride,
  onArtSheetKeyChange,
}: {
  item: CostLineResult;
  quantity: number | null;
  artSheetsOverride?: boolean;
  artSheetsManualRaw?: string;
  onArtSheetsOverrideChange?: (v: boolean) => void;
  onArtSheetsManualRawChange?: (v: string) => void;
  artSheetOptions?: {
    key: string;
    width: number;
    height: number;
    piecesPerSheet: number;
    wastagePercent: number;
    isRecommended: boolean;
  }[];
  artSheetKeyOverride?: string | null;
  onArtSheetKeyChange?: (key: string | null) => void;
}) {
  const meta = item.meta ?? {};
  const isArt = meta.paperType === "art";
  const isExcluded = !!item.excluded;
  const autoSheets = Number(meta.autoSheetsRequired ?? meta.piecesRequired ?? 0);
  const canEditSheets =
    isArt &&
    !isExcluded &&
    onArtSheetsOverrideChange != null &&
    onArtSheetsManualRawChange != null;
  const sheetsOverride = !!artSheetsOverride;
  const canPickSheet =
    isArt &&
    !isExcluded &&
    onArtSheetKeyChange != null &&
    (artSheetOptions?.length ?? 0) > 0;
  const selectValue = artSheetKeyOverride ?? "auto";

  return (
    <Card
      className={clsx(
        isExcluded
          ? "border-red-500/30 bg-red-500/5"
          : "border-pacify-silver/25 bg-pacify-silver/5",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3
          className={clsx(
            "text-sm font-semibold",
            isExcluded ? "text-red-200" : "text-pacify-silver",
          )}
        >
          {item.label}
        </h3>
        <span className="text-sm font-bold text-white tabular-nums">
          {isExcluded
            ? item.warning ?? "N/A"
            : formatPkrTotal(item.total)}
        </span>
      </div>

      {isExcluded ? (
        <p className="text-xs text-red-300">
          {item.warning ?? "Unavailable"}
          {meta.artWidthIn != null && meta.artHeightIn != null && (
            <span className="block text-red-400/80 mt-1">
              Art size{" "}
              {formatLength(Number(meta.artWidthIn), "in")} ×{" "}
              {formatLength(Number(meta.artHeightIn), "in")} in
            </span>
          )}
        </p>
      ) : isArt ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-gray-600">Art paper size</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatLength(Number(meta.artWidthIn), "in")} ×{" "}
              {formatLength(Number(meta.artHeightIn), "in")} in
            </p>
          </div>
          <div className={canPickSheet ? "col-span-2 sm:col-span-2" : undefined}>
            <p className="text-gray-600 mb-1">Sheet used</p>
            {canPickSheet ? (
              <>
                <select
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    onArtSheetKeyChange!(v === "auto" ? null : v);
                  }}
                  className={inputCls}
                >
                  {(() => {
                    const best = artSheetOptions!.find((o) => o.isRecommended);
                    return (
                      <option value="auto">
                        Auto — recommended
                        {best ? ` (${best.width}×${best.height})` : ""}
                      </option>
                    );
                  })()}
                  {artSheetOptions!.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.width}×{o.height} in · {o.piecesPerSheet} pcs/sheet ·{" "}
                      {o.wastagePercent.toFixed(1)}% waste
                      {o.isRecommended ? " (best)" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-gray-600">
                  Changes paper, lamination, and all sheet-based costs
                </p>
              </>
            ) : (
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {meta.sheetWidth}×{meta.sheetHeight} in
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-600">Pieces / sheet</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {meta.piecesPerSheet}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Per-sheet cost</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatPkr(Number(meta.perSheetCost ?? 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cost / piece</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatPkr(item.perUnit)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">
              Per side (qty + {meta.extraSheets ?? 200} extra)
            </p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {Number(meta.piecesPerSide ?? 0).toLocaleString("en-US")}{" "}
              {meta.printSides === "double" ? "× 2 sides" : ""}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-gray-600">Total sheets required</p>
              {canEditSheets && sheetsOverride && (
                <button
                  type="button"
                  onClick={() => {
                    onArtSheetsOverrideChange!(false);
                    onArtSheetsManualRawChange!("");
                  }}
                  className="text-[10px] text-pacify-gold hover:text-pacify-gold/80"
                >
                  Use auto
                </button>
              )}
            </div>
            {canEditSheets ? (
              <>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  value={
                    sheetsOverride
                      ? (artSheetsManualRaw ?? "")
                      : String(autoSheets || "")
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!sheetsOverride) onArtSheetsOverrideChange!(true);
                    onArtSheetsManualRawChange!(raw);
                  }}
                  onFocus={() => {
                    if (!sheetsOverride) {
                      onArtSheetsOverrideChange!(true);
                      onArtSheetsManualRawChange!(String(autoSheets || ""));
                    }
                  }}
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-gray-600">
                  {sheetsOverride
                    ? `Auto would be ${autoSheets.toLocaleString("en-US")}`
                    : "Editable — change to override cost"}
                </p>
              </>
            ) : (
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {Number(meta.piecesRequired ?? 0).toLocaleString("en-US")}
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-600">Physical sheets</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {Number(meta.physicalSheets ?? 0).toLocaleString("en-US")}
              <span className="text-gray-600"> (info only)</span>
            </p>
          </div>
          <div>
            <p className="text-gray-600">Print sides</p>
            <p className="text-gray-300 mt-0.5">
              {meta.printSides === "single" ? "Single side" : "Double side"}
              {meta.sidesMultiplier != null && (
                <span className="text-gray-600">
                  {" "}
                  (×{meta.sidesMultiplier})
                </span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-gray-600">Piece size</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatLength(Number(meta.artWidthIn), "in")} ×{" "}
              {formatLength(Number(meta.artHeightIn), "in")} in
            </p>
          </div>
          <div>
            <p className="text-gray-600">Orientation</p>
            <p className="text-gray-300 mt-0.5">
              {String(meta.orientation)} · {meta.piecesAcross} across roll
            </p>
          </div>
          <div>
            <p className="text-gray-600">Roll length / piece</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {Number(meta.rollLengthPerPiece).toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}{" "}
              in
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cost / unit</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatPkr(item.perUnit)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Total roll length</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {Number(meta.totalRollLengthIn).toLocaleString("en-US", {
                maximumFractionDigits: 1,
              })}{" "}
              in
              <span className="text-gray-600">
                {" "}
                (
                {Number(meta.totalRollLengthYards).toLocaleString("en-US", {
                  maximumFractionDigits: 1,
                })}{" "}
                yd)
              </span>
            </p>
          </div>
          <div>
            <p className="text-gray-600">Quantity</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {(quantity ?? 0).toLocaleString("en-US")}
              {Number(meta.extraPieces) > 0 && (
                <span className="text-gray-600">
                  {" "}
                  +{meta.extraPieces} extra
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function LaminationCard({ item }: { item: CostLineResult }) {
  const meta = item.meta ?? {};
  const isExcluded = !!item.excluded;

  return (
    <Card
      className={clsx(
        isExcluded
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-teal-500/20 bg-teal-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3
          className={clsx(
            "text-sm font-semibold",
            isExcluded ? "text-amber-200" : "text-teal-200",
          )}
        >
          Lamination
        </h3>
        <span className="text-sm font-bold text-white tabular-nums">
          {isExcluded
            ? item.warning ?? "N/A"
            : formatPkrTotal(item.total)}
        </span>
      </div>
      {isExcluded ? (
        <p className="text-xs text-amber-300">{item.warning}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-gray-600">Sheet size</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {meta.sheetWidth}×{meta.sheetHeight} in
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cost / sheet</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatPkr(Number(meta.perSheet ?? 0))}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Lamination qty</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {Number(meta.laminationQty ?? 0).toLocaleString("en-US")}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cost / unit</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatPkr(item.perUnit)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function SpotUvCard({
  item,
  quantity,
  config,
  spotUvOverride,
  spotUvManualRaw,
  onSpotUvOverrideChange,
  onSpotUvManualRawChange,
}: {
  item: CostLineResult;
  quantity: number | null;
  config: CostConfig;
  spotUvOverride?: boolean;
  spotUvManualRaw?: string;
  onSpotUvOverrideChange?: (v: boolean) => void;
  onSpotUvManualRawChange?: (v: string) => void;
}) {
  const meta = item.meta ?? {};
  const qty = quantity ?? 0;
  const tier =
    meta.tier === "mid" || meta.tier === "high" || meta.tier === "fixed"
      ? meta.tier
      : "fixed";
  const autoHint =
    tier === "fixed"
      ? formatPkrTotal(config.spotUv.fixedCost)
      : tier === "mid"
        ? `${config.spotUv.midRatePerUnit} / unit`
        : `${config.spotUv.highRatePerUnit} / unit`;

  return (
    <Card className="border-violet-500/20 bg-violet-500/5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-violet-200">Spot UV</h3>
          <EstimateBadge />
        </div>
        <span className="text-sm font-bold text-white tabular-nums">
          {formatPkrTotal(item.total)}
        </span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-gray-600">Mode</p>
            <p className="text-gray-300 mt-0.5">
              {meta.usedAutomatic
                ? tier === "fixed"
                  ? `Fixed ≤ ${config.spotUv.fixedMaxQty}`
                  : tier === "mid"
                    ? `${config.spotUv.midRatePerUnit} / unit (≤ ${config.spotUv.midMaxQty})`
                    : `${config.spotUv.highRatePerUnit} / unit (> ${config.spotUv.midMaxQty})`
                : "Manual entry"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cost / unit</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {formatPkr(item.perUnit)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Quantity</p>
            <p className="text-gray-300 mt-0.5 tabular-nums">
              {qty.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        {qty > 0 && onSpotUvOverrideChange && (
          <div className="flex items-center gap-2 text-xs">
            {!spotUvOverride ? (
              <button
                type="button"
                onClick={() => onSpotUvOverrideChange(true)}
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                Override
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSpotUvOverrideChange(false);
                  onSpotUvManualRawChange?.("");
                }}
                className="text-gray-400 hover:text-gray-200 underline underline-offset-2"
              >
                Use automatic ({autoHint})
              </button>
            )}
          </div>
        )}

        {!!spotUvOverride && onSpotUvManualRawChange && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Spot UV cost (PKR, total)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder={`Optional override (auto ${autoHint})`}
              value={spotUvManualRaw ?? ""}
              onChange={(e) => onSpotUvManualRawChange(e.target.value)}
              className={inputCls}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function OverridableJobCard({
  title,
  item,
  quantity,
  autoLabel,
  override,
  manualRaw,
  onOverrideChange,
  onManualRawChange,
  inputLabel,
  accentClass,
  titleClass,
  linkClass,
}: {
  title: string;
  item: CostLineResult;
  quantity: number | null;
  autoLabel: string;
  override?: boolean;
  manualRaw?: string;
  onOverrideChange?: (v: boolean) => void;
  onManualRawChange?: (v: string) => void;
  inputLabel: string;
  accentClass: string;
  titleClass: string;
  linkClass: string;
}) {
  const meta = item.meta ?? {};

  return (
    <Card className={accentClass}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className={`text-sm font-semibold ${titleClass}`}>{title}</h3>
        <span className="text-sm font-bold text-white tabular-nums">
          {formatPkrTotal(item.total)}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3">
        <div>
          <p className="text-gray-600">Mode</p>
          <p className="text-gray-300 mt-0.5">
            {meta.usedAutomatic ? autoLabel : "Override"}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Cost / unit</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            {formatPkr(item.perUnit)}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Quantity</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            {(quantity ?? 0).toLocaleString("en-US")}
          </p>
        </div>
      </div>
      {onOverrideChange && (
        <div className="flex items-center gap-2 text-xs mb-2">
          {!override ? (
            <button
              type="button"
              onClick={() => onOverrideChange(true)}
              className={`${linkClass} underline underline-offset-2`}
            >
              Override
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOverrideChange(false);
                onManualRawChange?.("");
              }}
              className="text-gray-400 hover:text-gray-200 underline underline-offset-2"
            >
              Use {autoLabel}
            </button>
          )}
        </div>
      )}
      {override && onManualRawChange && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            {inputLabel}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="Enter total"
            value={manualRaw ?? ""}
            onChange={(e) => onManualRawChange(e.target.value)}
            className={inputCls}
          />
        </div>
      )}
    </Card>
  );
}

function PrintingCard({
  item,
  quantity,
  override,
  manualRaw,
  onOverrideChange,
  onManualRawChange,
}: {
  item: CostLineResult;
  quantity: number | null;
  override?: boolean;
  manualRaw?: string;
  onOverrideChange?: (v: boolean) => void;
  onManualRawChange?: (v: string) => void;
}) {
  const meta = item.meta ?? {};
  const autoLabel = `${meta.colors} color${Number(meta.colors) !== 1 ? "s" : ""} × ${formatPkrTotal(Number(meta.costPerColor ?? 0))} × ${meta.sides} side${Number(meta.sides) !== 1 ? "s" : ""}`;

  return (
    <Card className="border-pacify-navy/40 bg-pacify-navy/20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-pacify-silver">Printing</h3>
        <span className="text-sm font-bold text-white tabular-nums">
          {formatPkrTotal(item.total)}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
        <div>
          <p className="text-gray-600">Colors</p>
          <p className="text-gray-300 mt-0.5">
            {meta.colorMode === "cmyk" ? "CMYK (4)" : "1 color"}
          </p>
        </div>
        <div>
          <p className="text-gray-600">One side</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            {formatPkrTotal(Number(meta.oneSideCost ?? 0))}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Print sides</p>
          <p className="text-gray-300 mt-0.5">
            {meta.printSides === "single" ? "Single" : "Double"}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Cost / unit</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            {formatPkr(item.perUnit)}
          </p>
        </div>
      </div>
      {onOverrideChange && (
        <div className="flex items-center gap-2 text-xs mb-2">
          {!override ? (
            <button
              type="button"
              onClick={() => onOverrideChange(true)}
              className="text-pacify-gold hover:text-pacify-gold/80 underline underline-offset-2"
            >
              Override
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOverrideChange(false);
                onManualRawChange?.("");
              }}
              className="text-gray-400 hover:text-gray-200 underline underline-offset-2"
            >
              Use calculated ({autoLabel})
            </button>
          )}
        </div>
      )}
      {override && onManualRawChange && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Printing cost (PKR, total)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="Enter total"
            value={manualRaw ?? ""}
            onChange={(e) => onManualRawChange(e.target.value)}
            className={inputCls}
          />
        </div>
      )}
      <p className="text-[11px] text-gray-600 mt-2">
        Qty {(quantity ?? 0).toLocaleString("en-US")}
        {meta.usedAutomatic ? ` · ${autoLabel}` : " · Manual override"}
      </p>
    </Card>
  );
}

function PlatesCard({
  item,
  quantity,
  override,
  manualRaw,
  onOverrideChange,
  onManualRawChange,
}: {
  item: CostLineResult;
  quantity: number | null;
  override?: boolean;
  manualRaw?: string;
  onOverrideChange?: (v: boolean) => void;
  onManualRawChange?: (v: string) => void;
}) {
  const meta = item.meta ?? {};
  const qtyMult = Number(meta.qtyMultiplier ?? 1);
  const baseLabel = `${meta.plates} plate${Number(meta.plates) !== 1 ? "s" : ""} × ${formatPkrTotal(Number(meta.costPerPlate ?? 0))} × ${meta.sides} side${Number(meta.sides) !== 1 ? "s" : ""}`;
  const autoLabel =
    qtyMult > 1
      ? `${baseLabel} × ${qtyMult} (qty tier)`
      : baseLabel;

  return (
    <Card className="border-fuchsia-500/20 bg-fuchsia-500/5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-fuchsia-200">
          Printing plates
        </h3>
        <span className="text-sm font-bold text-white tabular-nums">
          {formatPkrTotal(item.total)}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
        <div>
          <p className="text-gray-600">Plates</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            {meta.plates} ({meta.colorMode === "cmyk" ? "CMYK" : "1 color"})
          </p>
        </div>
        <div>
          <p className="text-gray-600">Base (1×)</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            {formatPkrTotal(Number(meta.baseTotal ?? meta.oneSideCost ?? 0))}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Qty multiplier</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            ×{qtyMult}
            {meta.tier === "mid"
              ? ` (≤ ${meta.midMaxQty ?? 2500})`
              : meta.tier === "high"
                ? ` (> ${meta.midMaxQty ?? 2500})`
                : ` (≤ ${meta.baseMaxQty ?? 1000})`}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Cost / unit</p>
          <p className="text-gray-300 mt-0.5 tabular-nums">
            {formatPkr(item.perUnit)}
          </p>
        </div>
      </div>
      {onOverrideChange && (
        <div className="flex items-center gap-2 text-xs mb-2">
          {!override ? (
            <button
              type="button"
              onClick={() => onOverrideChange(true)}
              className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2"
            >
              Override
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOverrideChange(false);
                onManualRawChange?.("");
              }}
              className="text-gray-400 hover:text-gray-200 underline underline-offset-2"
            >
              Use calculated ({autoLabel})
            </button>
          )}
        </div>
      )}
      {override && onManualRawChange && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Plates cost (PKR, total)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="Enter total"
            value={manualRaw ?? ""}
            onChange={(e) => onManualRawChange(e.target.value)}
            className={inputCls}
          />
        </div>
      )}
      <p className="text-[11px] text-gray-600 mt-2">
        Qty {(quantity ?? 0).toLocaleString("en-US")}
        {meta.usedAutomatic ? ` · ${autoLabel}` : " · Manual override"}
      </p>
    </Card>
  );
}

export function CostCalculation({
  result,
  quantity,
  config,
  onConfigChange,
  spotUvEnabled,
  spotUvOverride,
  spotUvManualRaw,
  onSpotUvOverrideChange,
  onSpotUvManualRawChange,
  dieEnabled,
  dieOverride,
  dieManualRaw,
  onDieOverrideChange,
  onDieManualRawChange,
  printingEnabled,
  printingOverride,
  printingManualRaw,
  onPrintingOverrideChange,
  onPrintingManualRawChange,
  platesEnabled,
  platesOverride,
  platesManualRaw,
  onPlatesOverrideChange,
  onPlatesManualRawChange,
  foiling,
  labor,
  deboss,
  embossing,
  profitRatio,
  clientName,
  onDownloadPdf,
  artSheetsOverride,
  artSheetsManualRaw,
  onArtSheetsOverrideChange,
  onArtSheetsManualRawChange,
  artSheetOptions,
  artSheetKeyOverride,
  onArtSheetKeyChange,
  hideTotals = false,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  function updateGreyboard(partial: Partial<GreyboardConfig>) {
    onConfigChange({
      ...config,
      greyboard: { ...config.greyboard, ...partial },
    });
  }

  function updateArtPaper(partial: Partial<ArtPaperConfig>) {
    onConfigChange({
      ...config,
      artPaper: { ...config.artPaper, ...partial },
    });
  }

  function updateMorocco(partial: Partial<MoroccoPaperConfig>) {
    onConfigChange({
      ...config,
      morocco: { ...config.morocco, ...partial },
    });
  }

  function updateLamination(partial: Partial<LaminationConfig>) {
    onConfigChange({
      ...config,
      lamination: { ...config.lamination, ...partial },
    });
  }

  function updateSpotUv(partial: Partial<SpotUvConfig>) {
    onConfigChange({
      ...config,
      spotUv: { ...config.spotUv, ...partial },
    });
  }

  function updateDie(partial: Partial<DieConfig>) {
    onConfigChange({
      ...config,
      die: { ...config.die, ...partial },
    });
  }

  function updatePrinting(partial: Partial<PrintingConfig>) {
    onConfigChange({
      ...config,
      printing: { ...config.printing, ...partial },
    });
  }

  function updatePlates(partial: Partial<PlatesConfig>) {
    onConfigChange({
      ...config,
      plates: { ...config.plates, ...partial },
    });
  }

  function updateFixedJob(
    key: "foiling" | "deboss" | "embossing",
    partial: Partial<FixedJobConfig>,
  ) {
    onConfigChange({
      ...config,
      [key]: { ...config[key], ...partial },
    });
  }

  function updateWeight(partial: Partial<WeightConfig>) {
    onConfigChange({
      ...config,
      weight: { ...config.weight, ...partial },
    });
  }

  function updateShipping(partial: Partial<ShippingConfig>) {
    onConfigChange({
      ...config,
      shipping: { ...config.shipping, ...partial },
    });
  }

  function updateFx(partial: Partial<FxConfig>) {
    onConfigChange({
      ...config,
      fx: { ...config.fx, ...partial },
    });
  }

  function resetAllDefaults() {
    onConfigChange({
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
    });
  }

  if (!result) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-white mb-2">Cost Calculation</h2>
        <p className="text-sm text-gray-600 py-4 text-center">
          Enter valid box dimensions and quantity to see costs.
        </p>
      </Card>
    );
  }

  const greyboard = result.items.find((i) => i.id === "greyboard");
  const paper = result.items.find((i) => i.id === "paper");
  const lamination = result.items.find((i) => i.id === "lamination");
  const spotUv = result.items.find((i) => i.id === "spotUv");
  const die = result.items.find((i) => i.id === "die");
  const printing = result.items.find((i) => i.id === "printing");
  const plates = result.items.find((i) => i.id === "plates");
  const foilingItem = result.items.find((i) => i.id === "foiling");
  const laborItem = result.items.find((i) => i.id === "labor");
  const debossItem = result.items.find((i) => i.id === "deboss");
  const embossingItem = result.items.find((i) => i.id === "embossing");
  const shipping = result.items.find((i) => i.id === "shipping");
  const extra = result.items.find((i) => i.id === "extra");
  const knownIds = new Set([
    "greyboard",
    "paper",
    "lamination",
    "spotUv",
    "die",
    "printing",
    "plates",
    "foiling",
    "labor",
    "deboss",
    "embossing",
    "shipping",
    "extra",
  ]);
  const otherItems = result.items.filter((i) => !knownIds.has(i.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Cost Calculation</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {clientName?.trim()
              ? `Quote for ${clientName.trim()}`
              : "Add a client name above to include it on the PDF"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronDownIcon
              className={clsx(
                "h-3.5 w-3.5 transition-transform",
                showAdvanced && "rotate-180",
              )}
            />
            Cost settings
          </button>
          {onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="btn-primary gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download PDF
            </button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="space-y-3">
          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Greyboard
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    greyboard: { ...DEFAULT_GREYBOARD_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { key: "gsm" as const, label: "GSM", step: "1" },
                  { key: "factor" as const, label: "Factor", step: "1" },
                  { key: "divisor" as const, label: "Divisor", step: "1" },
                  { key: "markup" as const, label: "Markup", step: "0.01" },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  {numField(config.greyboard[key], (n) => updateGreyboard({ [key]: n }), step)}
                  <p className="mt-1 text-[10px] text-gray-600">
                    Default {DEFAULT_COST_CONFIG.greyboard[key]}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Art Paper
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    artPaper: { ...DEFAULT_ART_PAPER_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(
                [
                  { key: "gsm" as const, label: "GSM", step: "1" },
                  { key: "factor" as const, label: "Factor", step: "1" },
                  { key: "divisor" as const, label: "Divisor", step: "1" },
                  { key: "scale" as const, label: "Scale", step: "1" },
                  { key: "markup" as const, label: "Markup", step: "0.01" },
                  {
                    key: "extraSheets" as const,
                    label: "Extra / side",
                    step: "1",
                  },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  {numField(config.artPaper[key], (n) => updateArtPaper({ [key]: n }), step)}
                  <p className="mt-1 text-[10px] text-gray-600">
                    Default {DEFAULT_COST_CONFIG.artPaper[key]}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Morocco Paper
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    morocco: { ...DEFAULT_MOROCCO_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(
                [
                  {
                    key: "rollWidthIn" as const,
                    label: "Roll width (in)",
                    step: "1",
                  },
                  {
                    key: "yardLengthIn" as const,
                    label: "Yard length (in)",
                    step: "1",
                  },
                  {
                    key: "pricePerYard" as const,
                    label: "Price / yard",
                    step: "1",
                  },
                  { key: "markup" as const, label: "Markup", step: "0.01" },
                  {
                    key: "extraPieces" as const,
                    label: "Extra pieces",
                    step: "1",
                  },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  {numField(config.morocco[key], (n) => updateMorocco({ [key]: n }), step)}
                  <p className="mt-1 text-[10px] text-gray-600">
                    Default {DEFAULT_COST_CONFIG.morocco[key]}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Lamination
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    lamination: { ...DEFAULT_LAMINATION_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { key: "divisor" as const, label: "Divisor", step: "1" },
                  { key: "rate" as const, label: "Rate", step: "0.01" },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  {numField(
                    config.lamination[key],
                    (n) => updateLamination({ [key]: n }),
                    step,
                  )}
                  <p className="mt-1 text-[10px] text-gray-600">
                    Default {DEFAULT_COST_CONFIG.lamination[key]}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Spot UV
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    spotUv: { ...DEFAULT_SPOT_UV_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  {
                    key: "fixedCost" as const,
                    label: "Fixed cost (PKR)",
                    step: "1",
                  },
                  {
                    key: "fixedMaxQty" as const,
                    label: "Max qty for fixed",
                    step: "1",
                  },
                  {
                    key: "midMaxQty" as const,
                    label: "Max qty for mid rate",
                    step: "1",
                  },
                  {
                    key: "midRatePerUnit" as const,
                    label: "Mid rate / unit",
                    step: "1",
                  },
                  {
                    key: "highRatePerUnit" as const,
                    label: "High rate / unit",
                    step: "1",
                  },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  {numField(
                    config.spotUv[key],
                    (n) => updateSpotUv({ [key]: n }),
                    step,
                  )}
                  <p className="mt-1 text-[10px] text-gray-600">
                    Default {DEFAULT_COST_CONFIG.spotUv[key]}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-gray-600">
              ≤ {config.spotUv.fixedMaxQty}: fixed {config.spotUv.fixedCost} ·{" "}
              ≤ {config.spotUv.midMaxQty}: {config.spotUv.midRatePerUnit}/unit ·{" "}
              &gt; {config.spotUv.midMaxQty}: {config.spotUv.highRatePerUnit}
              /unit
            </p>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Die making + Die cutting
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    die: { ...DEFAULT_DIE_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Fixed cost (PKR)
                </label>
                {numField(
                  config.die.fixedCost,
                  (n) => updateDie({ fixedCost: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.die.fixedCost}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Printing
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    printing: { ...DEFAULT_PRINTING_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Cost / color (one side)
                </label>
                {numField(
                  config.printing.costPerColor,
                  (n) => updatePrinting({ costPerColor: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.printing.costPerColor}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Printing plates
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    plates: { ...DEFAULT_PLATES_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Cost / plate (one side)
                </label>
                {numField(
                  config.plates.costPerPlate,
                  (n) => updatePlates({ costPerPlate: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.plates.costPerPlate}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Max qty for 1×
                </label>
                {numField(
                  config.plates.baseMaxQty ?? 1000,
                  (n) => updatePlates({ baseMaxQty: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.plates.baseMaxQty}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Max qty for 2×
                </label>
                {numField(
                  config.plates.midMaxQty ?? 2500,
                  (n) => updatePlates({ midMaxQty: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.plates.midMaxQty}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-gray-600">
              ≤ {config.plates.baseMaxQty}: 1× base · ≤ {config.plates.midMaxQty}
              : 2× · &gt; {config.plates.midMaxQty}: 3× (CMYK one side base =
              8,000)
            </p>
          </Card>

          {(
            [
              {
                key: "foiling" as const,
                title: "Silver / Gold Foiling",
                defaults: DEFAULT_FOILING_CONFIG,
              },
              {
                key: "deboss" as const,
                title: "Deboss",
                defaults: DEFAULT_DEBOSS_CONFIG,
              },
              {
                key: "embossing" as const,
                title: "Embossing",
                defaults: DEFAULT_EMBOSSING_CONFIG,
              },
            ] as const
          ).map(({ key, title, defaults }) => (
            <Card key={key} className="border-gray-800 bg-gray-900/80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onConfigChange({
                      ...config,
                      [key]: { ...defaults },
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                  Reset to defaults
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Fixed cost (PKR)
                  </label>
                  {numField(
                    config[key].fixedCost,
                    (n) => updateFixedJob(key, { fixedCost: n }),
                    "1",
                  )}
                  <p className="mt-1 text-[10px] text-gray-600">
                    Default {defaults.fixedCost}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Weight
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    weight: { ...DEFAULT_WEIGHT_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(
                [
                  { key: "gsm" as const, label: "GSM", step: "1" },
                  { key: "divisor" as const, label: "Divisor", step: "1" },
                  { key: "scale" as const, label: "Scale", step: "1" },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  {numField(
                    config.weight[key],
                    (n) => updateWeight({ [key]: n }),
                    step,
                  )}
                  <p className="mt-1 text-[10px] text-gray-600">
                    Default {DEFAULT_COST_CONFIG.weight[key]}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Shipping
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    shipping: { ...DEFAULT_SHIPPING_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Rate / kg (PKR)
                </label>
                {numField(
                  config.shipping.ratePerKg,
                  (n) => updateShipping({ ratePerKg: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.shipping.ratePerKg}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Volumetric divisor
                </label>
                {numField(
                  config.shipping.volumetricDivisor ?? 5000,
                  (n) => updateShipping({ volumetricDivisor: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.shipping.volumetricDivisor} — (L×W×H
                  cm) ÷ divisor
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-gray-800 bg-gray-900/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                USD rate
              </h3>
              <button
                type="button"
                onClick={() =>
                  onConfigChange({
                    ...config,
                    fx: { ...DEFAULT_FX_CONFIG },
                  })
                }
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  PKR per 1 USD
                </label>
                {numField(
                  config.fx.usdRate,
                  (n) => updateFx({ usdRate: n }),
                  "1",
                )}
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.fx.usdRate}
                </p>
              </div>
            </div>
          </Card>

          <button
            type="button"
            onClick={resetAllDefaults}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Reset all cost defaults
          </button>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {result.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {greyboard && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-amber-200">Greyboard</h3>
              <span className="text-sm font-bold text-white tabular-nums">
                {formatPkrTotal(greyboard.total)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-600">Open size</p>
                <p className="text-gray-300 mt-0.5 tabular-nums">
                  {formatLength(Number(greyboard.meta?.openWidthIn ?? 0), "in")} ×{" "}
                  {formatLength(Number(greyboard.meta?.openHeightIn ?? 0), "in")} in
                </p>
              </div>
              <div>
                <p className="text-gray-600">GSM</p>
                <p className="text-gray-300 mt-0.5 tabular-nums">
                  {greyboard.meta?.gsm ?? config.greyboard.gsm}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Cost / unit</p>
                <p className="text-gray-300 mt-0.5 tabular-nums">
                  {formatPkr(greyboard.perUnit)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Quantity</p>
                <p className="text-gray-300 mt-0.5 tabular-nums">
                  {(quantity ?? 0).toLocaleString("en-US")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {paper && (
          <PaperCard
            item={paper}
            quantity={quantity}
            artSheetsOverride={artSheetsOverride}
            artSheetsManualRaw={artSheetsManualRaw}
            onArtSheetsOverrideChange={onArtSheetsOverrideChange}
            onArtSheetsManualRawChange={onArtSheetsManualRawChange}
            artSheetOptions={artSheetOptions}
            artSheetKeyOverride={artSheetKeyOverride}
            onArtSheetKeyChange={onArtSheetKeyChange}
          />
        )}
        {lamination && <LaminationCard item={lamination} />}
        {spotUv && spotUvEnabled && (
          <SpotUvCard
            item={spotUv}
            quantity={quantity}
            config={config}
            spotUvOverride={spotUvOverride}
            spotUvManualRaw={spotUvManualRaw}
            onSpotUvOverrideChange={onSpotUvOverrideChange}
            onSpotUvManualRawChange={onSpotUvManualRawChange}
          />
        )}
        {die && dieEnabled && (
          <OverridableJobCard
            title="Die making + Die cutting"
            item={die}
            quantity={quantity}
            autoLabel={`Fixed ${formatPkrTotal(config.die.fixedCost)}`}
            override={dieOverride}
            manualRaw={dieManualRaw}
            onOverrideChange={onDieOverrideChange}
            onManualRawChange={onDieManualRawChange}
            inputLabel="Die cost (PKR, total)"
            accentClass="border-rose-500/20 bg-rose-500/5"
            titleClass="text-rose-200"
            linkClass="text-rose-400 hover:text-rose-300"
          />
        )}
        {printing && printingEnabled && (
          <PrintingCard
            item={printing}
            quantity={quantity}
            override={printingOverride}
            manualRaw={printingManualRaw}
            onOverrideChange={onPrintingOverrideChange}
            onManualRawChange={onPrintingManualRawChange}
          />
        )}
        {plates && platesEnabled && (
          <PlatesCard
            item={plates}
            quantity={quantity}
            override={platesOverride}
            manualRaw={platesManualRaw}
            onOverrideChange={onPlatesOverrideChange}
            onManualRawChange={onPlatesManualRawChange}
          />
        )}
        {foilingItem && foiling?.enabled && (
          <OverridableJobCard
            title="Silver / Gold Foiling"
            item={foilingItem}
            quantity={quantity}
            autoLabel={`Fixed ${formatPkrTotal(config.foiling.fixedCost)}`}
            override={foiling.override}
            manualRaw={foiling.manualRaw}
            onOverrideChange={foiling.onOverrideChange}
            onManualRawChange={foiling.onManualRawChange}
            inputLabel="Foiling cost (PKR, total)"
            accentClass="border-yellow-500/20 bg-yellow-500/5"
            titleClass="text-yellow-200"
            linkClass="text-yellow-400 hover:text-yellow-300"
          />
        )}
        {laborItem && labor?.enabled && (
          <OverridableJobCard
            title="Labor"
            item={laborItem}
            quantity={quantity}
            autoLabel={`Equals greyboard (${formatPkrTotal(Number(laborItem.meta?.greyboardTotal ?? laborItem.total))})`}
            override={labor.override}
            manualRaw={labor.manualRaw}
            onOverrideChange={labor.onOverrideChange}
            onManualRawChange={labor.onManualRawChange}
            inputLabel="Labor cost (PKR, total)"
            accentClass="border-orange-500/20 bg-orange-500/5"
            titleClass="text-orange-200"
            linkClass="text-orange-400 hover:text-orange-300"
          />
        )}
        {debossItem && deboss?.enabled && (
          <OverridableJobCard
            title="Deboss"
            item={debossItem}
            quantity={quantity}
            autoLabel={`Fixed ${formatPkrTotal(config.deboss.fixedCost)}`}
            override={deboss.override}
            manualRaw={deboss.manualRaw}
            onOverrideChange={deboss.onOverrideChange}
            onManualRawChange={deboss.onManualRawChange}
            inputLabel="Deboss cost (PKR, total)"
            accentClass="border-stone-500/20 bg-stone-500/5"
            titleClass="text-stone-200"
            linkClass="text-stone-300 hover:text-stone-100"
          />
        )}
        {embossingItem && embossing?.enabled && (
          <OverridableJobCard
            title="Embossing"
            item={embossingItem}
            quantity={quantity}
            autoLabel={`Fixed ${formatPkrTotal(config.embossing.fixedCost)}`}
            override={embossing.override}
            manualRaw={embossing.manualRaw}
            onOverrideChange={embossing.onOverrideChange}
            onManualRawChange={embossing.onManualRawChange}
            inputLabel="Embossing cost (PKR, total)"
            accentClass="border-lime-500/20 bg-lime-500/5"
            titleClass="text-lime-200"
            linkClass="text-lime-400 hover:text-lime-300"
          />
        )}
        {shipping && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-emerald-200">
                Weight & Shipping
              </h3>
              <span className="text-sm font-bold text-white tabular-nums">
                {formatPkrTotal(shipping.total)}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              {(
                [
                  {
                    value: "actual" as const,
                    label: "Actual weight",
                    hint: "Open size × GSM formula",
                  },
                  {
                    value: "volumetric" as const,
                    label: "Volumetric weight",
                    hint: "(L × W × H cm) ÷ 5000",
                  },
                ] as const
              ).map((opt) => {
                const checked =
                  (config.shipping.weightMode ?? "actual") === opt.value;
                return (
                  <label
                    key={opt.value}
                    className="inline-flex items-start gap-2 cursor-pointer text-gray-300"
                  >
                    <input
                      type="radio"
                      name="shipping-weight-mode"
                      value={opt.value}
                      checked={checked}
                      onChange={() =>
                        updateShipping({
                          weightMode: opt.value as ShippingWeightMode,
                        })
                      }
                      className="mt-0.5 border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/40"
                    />
                    <span>
                      <span className="font-medium text-white">{opt.label}</span>
                      <span className="block text-[10px] text-gray-600">
                        {opt.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {(config.shipping.weightMode ?? "actual") === "volumetric" ? (
                <div>
                  <p className="text-gray-600">Closed size (cm)</p>
                  <p className="text-gray-300 mt-0.5 tabular-nums">
                    {Number(shipping.meta?.lengthCm ?? 0).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    ×{" "}
                    {Number(shipping.meta?.widthCm ?? 0).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    ×{" "}
                    {Number(shipping.meta?.heightCm ?? 0).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    cm
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">Open size (no pad)</p>
                  <p className="text-gray-300 mt-0.5 tabular-nums">
                    {formatLength(Number(shipping.meta?.openWidthIn ?? 0), "in")} ×{" "}
                    {formatLength(Number(shipping.meta?.openHeightIn ?? 0), "in")}{" "}
                    in
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Weight / unit</p>
                <p className="text-gray-300 mt-0.5 tabular-nums">
                  {Number(shipping.meta?.perUnitKg ?? 0).toLocaleString("en-US", {
                    maximumFractionDigits: 6,
                  })}{" "}
                  kg
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total weight</p>
                <p className="text-gray-300 mt-0.5 tabular-nums">
                  {Number(shipping.meta?.totalKg ?? 0).toLocaleString("en-US", {
                    maximumFractionDigits: 4,
                  })}{" "}
                  kg
                </p>
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Rate / kg (PKR)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  value={config.shipping.ratePerKg}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n) || n < 0) return;
                    updateShipping({ ratePerKg: n });
                  }}
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-gray-600">
                  Default {DEFAULT_COST_CONFIG.shipping.ratePerKg}
                </p>
              </div>
            </div>
          </Card>
        )}
        {extra && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-amber-200">Extra</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Additional expenses
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white tabular-nums">
                  {formatPkrTotal(extra.total)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatPkr(extra.perUnit)} / unit
                </p>
              </div>
            </div>
          </Card>
        )}

        {otherItems.map((item) => (
          <Card key={item.id}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{item.label}</h3>
              <div className="text-right">
                <p className="text-sm font-bold text-white tabular-nums">
                  {item.excluded
                    ? item.warning ?? "N/A"
                    : formatPkrTotal(item.total)}
                </p>
                {!item.excluded && (
                  <p className="text-xs text-gray-500">
                    {formatPkr(item.perUnit)} / unit
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!hideTotals && (
        <CostTotalsSummary
          result={result}
          quantity={quantity}
          profitRatio={profitRatio}
          usdRate={config.fx.usdRate}
        />
      )}
    </div>
  );
}
