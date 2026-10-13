"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import {
  convertLength,
  formatLength,
  type LengthUnit,
} from "@/lib/lengthUnits";
import {
  recommendBestSheet,
  recommendSheet,
  sortNestResults,
  type NestSortMode,
  type SheetNestResult,
} from "@/lib/sheetNesting";
import { ALL_SHEETS, sheetKey, type SheetSize } from "@/lib/sheetSizes";

export type SheetOptimizationMode = "batches" | "flat";

interface Props {
  /** Open size in inches (from Part A) */
  openWidthIn: number;
  openHeightIn: number;
  paddingWIn: number;
  paddingHIn: number;
  /** Display unit for converted sheet sizes */
  unit: LengthUnit;
  /** Sheet list. Defaults to mailer ALL_SHEETS. */
  sheets?: readonly SheetSize[];
  /**
   * "batches" = STANDARD preferred + OUT fallback (mailer default)
   * "flat" = single list, no batch UI (rigid art paper)
   */
  mode?: SheetOptimizationMode;
  /** Label before the required/nesting size value */
  nestingSizeLabel?: string;
  /** Table title in flat mode */
  tableTitle?: string;
  /**
   * When provided, row clicks on fitting sheets drive cost calculation.
   * `null` = use automatic recommended sheet.
   */
  costSheetKey?: string | null;
  onCostSheetChange?: (key: string | null) => void;
}

function wastageColor(pct: number): string {
  if (pct < 15) return "text-emerald-400";
  if (pct <= 30) return "text-amber-400";
  return "text-red-400";
}

function BatchBadge({ batch }: { batch: "STANDARD" | "OUT" }) {
  return (
    <span
      className={clsx(
        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide",
        batch === "STANDARD"
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-amber-500/15 text-amber-400 border-amber-500/30",
      )}
    >
      {batch}
    </span>
  );
}

function SheetSizeLabel({
  width,
  height,
  unit,
}: {
  width: number;
  height: number;
  unit: LengthUnit;
}) {
  const converted =
    unit === "in"
      ? null
      : `${formatLength(convertLength(width, "in", unit), unit)}×${formatLength(convertLength(height, "in", unit), unit)} ${unit}`;
  return (
    <span>
      <span className="text-white font-medium tabular-nums">
        {width}×{height} in
      </span>
      {converted && (
        <span className="block text-[10px] text-gray-600">{converted}</span>
      )}
    </span>
  );
}

function NestPreview({
  result,
}: {
  result: SheetNestResult;
}) {
  const { sheet, placements, pieces } = result;
  const vbW = 320;
  const vbH = 220;
  const pad = 16;
  const scale = Math.min(
    (vbW - pad * 2) / sheet.width,
    (vbH - pad * 2) / sheet.height,
  );
  const rw = sheet.width * scale;
  const rh = sheet.height * scale;
  const ox = (vbW - rw) / 2;
  const oy = (vbH - rh) / 2;

  return (
    <div className="rounded-lg bg-gray-950 border border-gray-800 p-2">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full max-w-md mx-auto h-auto"
        role="img"
        aria-label={`${sheet.width}×${sheet.height} sheet with ${pieces} pieces`}
      >
        <rect
          x={ox}
          y={oy}
          width={rw}
          height={rh}
          fill="#111827"
          stroke="#6366f1"
          strokeWidth={1.5}
        />
        {placements.map((p, i) => (
          <rect
            key={i}
            x={ox + p.x * scale}
            y={oy + p.y * scale}
            width={Math.max(0, p.w * scale - 0.5)}
            height={Math.max(0, p.h * scale - 0.5)}
            fill={p.rotated ? "#0891b2" : "#4f46e5"}
            fillOpacity={0.55}
            stroke={p.rotated ? "#22d3ee" : "#818cf8"}
            strokeWidth={0.75}
          />
        ))}
        <text
          x={vbW / 2}
          y={oy - 4}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: 10 }}
        >
          {sheet.width}×{sheet.height} in · {pieces} pcs
        </text>
      </svg>
      <div className="flex justify-center gap-4 mt-1 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500" /> Unrotated
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-cyan-500" /> Rotated
        </span>
      </div>
    </div>
  );
}

function SheetTable({
  title,
  results,
  recommendedKey,
  sortMode,
  unit,
  selectedKey,
  onSelect,
  secondary,
  showBatch,
  costSheetKey,
  costSelectionEnabled,
  onCostSheetChange,
}: {
  title: string;
  results: SheetNestResult[];
  recommendedKey: string | null;
  sortMode: NestSortMode;
  unit: LengthUnit;
  selectedKey: string | null;
  onSelect: (r: SheetNestResult) => void;
  secondary?: boolean;
  showBatch: boolean;
  costSheetKey?: string | null;
  costSelectionEnabled?: boolean;
  onCostSheetChange?: (key: string | null) => void;
}) {
  const sorted = useMemo(
    () => sortNestResults([...results], sortMode),
    [results, sortMode],
  );

  const fittingPieceCounts = new Set(
    results.filter((r) => r.fits).map((r) => r.pieces),
  );
  const sortLooksSame =
    sortMode === "pieces" && fittingPieceCounts.size <= 1;

  return (
    <div className={clsx(secondary && "opacity-95")}>
      <h3
        className={clsx(
          "text-sm font-semibold mb-1",
          secondary ? "text-gray-400" : "text-white",
        )}
      >
        {title}
      </h3>
      <p className="text-[11px] text-gray-600 mb-2">
        Sorted by{" "}
        <span className="text-gray-400">
          {sortMode === "wastage" ? "lowest wastage %" : "most pieces / sheet"}
        </span>
        {sortLooksSame && (
          <span className="text-amber-500/80">
            {" "}
            — all fitting sheets have the same piece count, so order stays the same
          </span>
        )}
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/40">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sheet size
              </th>
              {showBatch && (
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Batch
                </th>
              )}
              <th
                className={clsx(
                  "px-3 py-2 text-right text-xs font-medium uppercase tracking-wide",
                  sortMode === "pieces" ? "text-indigo-400" : "text-gray-500",
                )}
              >
                Pieces per sheet{sortMode === "pieces" ? " ↓" : ""}
              </th>
              <th
                className={clsx(
                  "px-3 py-2 text-right text-xs font-medium uppercase tracking-wide",
                  sortMode === "wastage" ? "text-indigo-400" : "text-gray-500",
                )}
              >
                Wastage %{sortMode === "wastage" ? " ↓" : ""}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Layout
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {sorted.map((r) => {
              const key = sheetKey(r.sheet);
              const isBest = recommendedKey === key;
              const isSelected = selectedKey === key;
              const isCostActive =
                !!costSelectionEnabled &&
                (costSheetKey != null
                  ? costSheetKey === key
                  : isBest);
              return (
                <tr
                  key={key}
                  onClick={() => {
                    onSelect(r);
                    if (costSelectionEnabled && r.fits && onCostSheetChange) {
                      // Choosing the recommended sheet returns to auto mode
                      onCostSheetChange(isBest ? null : key);
                    }
                  }}
                  className={clsx(
                    "cursor-pointer transition-colors",
                    !r.fits && "bg-red-500/5",
                    isBest && "bg-indigo-500/10",
                    isCostActive && "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40",
                    isSelected && !isCostActive && "ring-1 ring-inset ring-indigo-500/40",
                    r.fits && !isBest && !isCostActive && "hover:bg-gray-800/50",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SheetSizeLabel
                        width={r.sheet.width}
                        height={r.sheet.height}
                        unit={unit}
                      />
                      {isBest && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                          Best
                        </span>
                      )}
                      {isCostActive && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          In use
                        </span>
                      )}
                    </div>
                  </td>
                  {showBatch && (
                    <td className="px-3 py-2.5">
                      <BatchBadge batch={r.sheet.batch} />
                    </td>
                  )}
                  <td
                    className={clsx(
                      "px-3 py-2.5 text-right font-semibold tabular-nums",
                      r.fits ? "text-white text-base" : "text-red-400",
                    )}
                  >
                    {r.pieces}
                  </td>
                  <td
                    className={clsx(
                      "px-3 py-2.5 text-right tabular-nums font-medium",
                      r.fits ? wastageColor(r.wastagePercent) : "text-red-400",
                    )}
                  >
                    {r.fits ? `${r.wastagePercent.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[140px]">
                    {r.layout}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {r.fits ? (
                      <span className="text-emerald-400">
                        {costSelectionEnabled
                          ? isCostActive
                            ? "Used for cost"
                            : "Click to use"
                          : "Fits"}
                      </span>
                    ) : (
                      <span className="text-red-400 font-medium">Does not fit</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SheetOptimization({
  openWidthIn,
  openHeightIn,
  paddingWIn,
  paddingHIn,
  unit,
  sheets = ALL_SHEETS,
  mode = "batches",
  nestingSizeLabel = "Nesting size",
  tableTitle = "Art Paper sheets",
  costSheetKey = null,
  onCostSheetChange,
}: Props) {
  const [sortMode, setSortMode] = useState<NestSortMode>("wastage");
  const [outExpanded, setOutExpanded] = useState(false);
  const [selected, setSelected] = useState<SheetNestResult | null>(null);
  const costSelectionEnabled = onCostSheetChange != null;

  const nestingW = openWidthIn + paddingWIn;
  const nestingH = openHeightIn + paddingHIn;
  const isFlat = mode === "flat";

  useEffect(() => {
    setSelected(null);
  }, [nestingW, nestingH, sheets, mode]);

  const recommendation = useMemo(() => {
    const piece = { widthIn: nestingW, heightIn: nestingH };
    if (isFlat) {
      const flat = recommendBestSheet(piece, sheets);
      return {
        recommended: flat.recommended,
        usedOutFallback: false,
        noneFit: flat.noneFit,
        highestPieceCount: flat.highestPieceCount,
        standardResults: flat.allResults,
        outResults: [] as SheetNestResult[],
        allResults: flat.allResults,
      };
    }
    return recommendSheet(piece, sheets);
  }, [nestingW, nestingH, sheets, isFlat]);

  const showOutExpanded =
    !isFlat &&
    (outExpanded || recommendation.usedOutFallback || recommendation.noneFit);

  const recommendedKey = recommendation.recommended
    ? sheetKey(recommendation.recommended.sheet)
    : null;

  const activeCostNest = useMemo(() => {
    if (!costSelectionEnabled) return recommendation.recommended ?? null;
    if (costSheetKey) {
      const found = recommendation.allResults.find(
        (r) => r.fits && sheetKey(r.sheet) === costSheetKey,
      );
      if (found) return found;
    }
    return recommendation.recommended ?? null;
  }, [
    costSelectionEnabled,
    costSheetKey,
    recommendation.allResults,
    recommendation.recommended,
  ]);

  const previewResult =
    selected ?? activeCostNest ?? recommendation.recommended ?? null;

  const usingManualCostSheet =
    costSelectionEnabled &&
    costSheetKey != null &&
    recommendedKey != null &&
    costSheetKey !== recommendedKey;

  const highestDiffers =
    recommendation.highestPieceCount &&
    recommendation.recommended &&
    (sheetKey(recommendation.highestPieceCount.sheet) !==
      sheetKey(recommendation.recommended.sheet) ||
      recommendation.highestPieceCount.pieces !==
        recommendation.recommended.pieces);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Sheet Optimization</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {nestingSizeLabel}:{" "}
            <span className="text-gray-300 font-medium tabular-nums">
              {formatLength(nestingW, "in")} × {formatLength(nestingH, "in")} in
            </span>
            <span className="text-gray-600">
              {" "}
              (open + {paddingWIn}×{paddingHIn} in padding)
            </span>
          </p>
          {costSelectionEnabled && (
            <p className="text-[11px] text-emerald-400/90 mt-1">
              Click any fitting sheet to use it for paper, lamination, and cost.
              {usingManualCostSheet && activeCostNest
                ? ` Currently using ${activeCostNest.sheet.width}×${activeCostNest.sheet.height} in (manual).`
                : " Currently using auto-recommended sheet."}
            </p>
          )}
        </div>
        <div className="self-start">
          <p className="text-[10px] text-gray-600 mb-1 uppercase tracking-wide">
            Sort table rows
          </p>
          <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800/60 p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setSortMode("wastage")}
              className={clsx(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                sortMode === "wastage"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200",
              )}
            >
              Lowest wastage
            </button>
            <button
              type="button"
              onClick={() => setSortMode("pieces")}
              className={clsx(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                sortMode === "pieces"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200",
              )}
            >
              Most pieces
            </button>
          </div>
        </div>
      </div>

      {recommendation.noneFit ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-300">
            No available sheet can fit this box.
          </p>
          {!isFlat && (
            <p className="text-xs text-red-400/80 mt-1">
              Reduce box size or add a larger sheet size.
            </p>
          )}
        </div>
      ) : recommendation.recommended ? (
        <Card className="border-indigo-500/30 bg-indigo-500/5">
          {!isFlat && recommendation.usedOutFallback && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              No standard sheet fits. Using Batch OUT sheet.
            </div>
          )}
          <p className="text-xs font-medium text-indigo-300/70 uppercase tracking-wide mb-2">
            Recommended sheet
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold text-white tabular-nums">
                  {recommendation.recommended.sheet.width}×
                  {recommendation.recommended.sheet.height} in
                </span>
                {!isFlat && (
                  <BatchBadge batch={recommendation.recommended.sheet.batch} />
                )}
                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                  Best
                </span>
                {costSelectionEnabled && !usingManualCostSheet && (
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                    In use
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 mt-2">
                <span className="text-2xl font-bold text-indigo-300 tabular-nums">
                  {recommendation.recommended.pieces}
                </span>{" "}
                pieces / sheet
                <span className="mx-2 text-gray-700">·</span>
                <span
                  className={clsx(
                    "font-semibold",
                    wastageColor(recommendation.recommended.wastagePercent),
                  )}
                >
                  {recommendation.recommended.wastagePercent.toFixed(1)}% wastage
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {recommendation.recommended.layout}
              </p>
              {highestDiffers && recommendation.highestPieceCount && (
                <p className="text-xs text-gray-600 mt-2">
                  Highest piece count:{" "}
                  {recommendation.highestPieceCount.sheet.width}×
                  {recommendation.highestPieceCount.sheet.height} in (
                  {recommendation.highestPieceCount.pieces} pieces)
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(recommendation.recommended)}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Show nest preview
              </button>
              {costSelectionEnabled && usingManualCostSheet && (
                <button
                  type="button"
                  onClick={() => onCostSheetChange?.(null)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                >
                  Use recommended for cost
                </button>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {previewResult && previewResult.fits && (
        <NestPreview result={previewResult} />
      )}

      {isFlat ? (
        <SheetTable
          title={tableTitle}
          results={recommendation.allResults}
          recommendedKey={recommendedKey}
          sortMode={sortMode}
          unit={unit}
          selectedKey={selected ? sheetKey(selected.sheet) : null}
          onSelect={setSelected}
          showBatch={false}
          costSheetKey={costSheetKey}
          costSelectionEnabled={costSelectionEnabled}
          onCostSheetChange={onCostSheetChange}
        />
      ) : (
        <>
          <SheetTable
            title="Batch Standard sheets"
            results={recommendation.standardResults}
            recommendedKey={recommendedKey}
            sortMode={sortMode}
            unit={unit}
            selectedKey={selected ? sheetKey(selected.sheet) : null}
            onSelect={setSelected}
            showBatch
          />

          <div>
            <button
              type="button"
              onClick={() => setOutExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors mb-2"
            >
              <ChevronDownIcon
                className={clsx(
                  "h-3.5 w-3.5 transition-transform",
                  showOutExpanded && "rotate-180",
                )}
              />
              Batch OUT sheets
              {recommendation.usedOutFallback && (
                <span className="text-amber-400">(fallback active)</span>
              )}
            </button>
            {showOutExpanded && (
              <SheetTable
                title="Batch OUT sheets"
                results={recommendation.outResults}
                recommendedKey={recommendedKey}
                sortMode={sortMode}
                unit={unit}
                selectedKey={selected ? sheetKey(selected.sheet) : null}
                onSelect={setSelected}
                secondary
                showBatch
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
